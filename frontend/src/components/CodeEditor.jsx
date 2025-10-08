import { useRef, useState, useEffect } from "react";
import { Box, HStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

import { Editor } from "@monaco-editor/react";
import { CODE_SNIPPETS, theme } from "../constants/api";
import  getCurrentUser  from "../hooks/getCurrentUser";
import axios from "axios";
import io from "socket.io-client";
import MatchTimer from "./MatchTimer";
const socket = io.connect("http://localhost:3001"); 


const languageOptions = {
  python: 71,
  cpp: 54,    // make sure these are keys in 
  // java: 62,
};




const CodeEditor = ({ match_id }) => {
  const editorRef = useRef();
  const navigate = useNavigate();
  const [match, setMatch] = useState({});
  const [language, setLanguage] = useState("python");
  const [problem, setProblem] = useState({});
  const [sourceCode, setSourceCode] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [showOpponentBox, setShowOpponentBox] = useState(true);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [outputInfo, setOutputInfo] = useState({});
  const [matchType, setMatchType] = useState({});   // either regular or explanation
  const recognitionRef = useRef(null);  // if its a explanation match use this
  const [isMatchStarted, setIsMatchStarted] = useState(() => {
    return !!localStorage.getItem('match_start_time');
  });
  const [shouldRestartTimer, setShouldRestartTimer] = useState(false);

  // variables for explanation match
  const [explanationTranscript, setExplanationTranscript] = useState("");
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);    // to toggle the microphone, default is on when match starts. 
  const [microphoneError, setMicrophoneError] = useState(null);   // if there is a microphone error
  // const [showDoneButton, setShowDoneButton] = useState(false);
  
  
  // Initialize matchStartTime from localStorage or create new one
  const [matchStartTime, setMatchStartTime] = useState(() => {
    const savedTime = localStorage.getItem('match_start_time');
    return savedTime ? new Date(savedTime) : null;
  });

  const handleCountdownComplete = (newStartTime) => {
    setMatchStartTime(newStartTime);
    localStorage.setItem('match_start_time', newStartTime.toISOString());
  };

  // Start match when both players are ready
  useEffect(() => {
    if (isMatchStarted) return;

    // This is where you would check if both players are ready
    // For now, we'll just start the match after a short delay
    const timer = setTimeout(() => {
      setIsMatchStarted(true);
      // Clear any existing timer state
      localStorage.removeItem('match_start_time');
      setMatchStartTime(null);
    }, 2000); // Start match after 2 seconds

    return () => clearTimeout(timer);
  }, [isMatchStarted]);

  // Handle match restart
  const handleRestartMatch = () => {
    setShouldRestartTimer(true);
    setIsMatchStarted(false);
    // Reset other match-related states here
    setTimeout(() => {
      setShouldRestartTimer(false);
      setIsMatchStarted(true);
    }, 100);
  };

  // Clean up localStorage when component unmounts
  useEffect(() => {
    return () => {
      // Only remove the timer if the match is over
      if (!isMatchStarted) {
        localStorage.removeItem('match_start_time');
      }
    };
  }, [isMatchStarted]);

  // define output variables to display near output box
  const [output, setOutput] = useState(null);
  const [time, setTime] = useState(null);
  const [memory, setMemory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  // opponent progress variables
  const [opponentSubmissions, setOpponentSubmissions] = useState(0);
  const [oppsCurTestcasesPassed, setOppsCurTestcasesPassed] = useState(0);
  const [oppsMaxTestcasesPassed, setOppsMaxTestcasesPassed] = useState(0);
  const [totalTestcases, setTotalTestcases] = useState(0);
  // cur users variables
  const [userSubmissions, setUserSubmissions] = useState(0);
  const [userCurTestcasesPassed, setUserCurTestcasesPassed] = useState(0);
  const [userMaxTestcasesPassed, setUserMaxTestcasesPassed] = useState(0);
  
  // Use ref to maintain socket instance, because during navigation socket.id changes. Maintains same ref through out component life cycle
  const socketRef = useRef(null); 


  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  // TO GET THE PROBLEM FOR THIS MATCH
  const fetchProblem = async (event) => {
    try {
      // this is slowing down application have to fetch problem, every time so store match in cache. 
      console.log("fetch problem language: ", language);
      const response = await axios.post(`http://localhost:3001/match/get-match-problem/${match_id}`, {language:language});  // string version language. send some payload language with it
      console.log("get-match-problem response data: ", response);
      setProblem(response.data.problem);
      setMatch(response.data.match)
      setSourceCode(response.data.template);    // set the dynamic template generated for this problem, this is the user code that they see and edit
      setTotalTestcases(response.data.problem.testcases.length);
      setMatchType(response.data.match.type); // update the match type stored in match-obj from toggle in find-match page
      console.log(response.data.problem);
    } catch (error) {
      // console.error(error.response.data.message);  
    }
  };

  useEffect(() => {
    fetchProblem();    


    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3001");
      console.log("creating new socket connection client:", socketRef.current.id);
    }
    socketRef.current.emit("rejoin_match", { match_id }); // if their socket changes rejoin-match

    // this is how we update the other players opps variables, and how we know to redirect them to match outcome page when the other but submits correct solution
    const handleOpponentUpdate = (data) => {
      console.log("Received opponent_update. Socket ID:", socketRef.current.id);
      console.log("Update data:", data);
      const userId = getCurrentUser();
      console.log("user: " + userId + " first_id: " + data.match.first_player._id + " second_id: " +data.match.second_player._id);
      // set the other players submissions, THIS IS NOT RUNNING??
      if (userId === data.match.first_player.toString()) {   // first-player
        setOpponentSubmissions(data.match.second_player_submissions);
        setOppsCurTestcasesPassed(data.match.second_player_latest_testcases_passed);
        setOppsMaxTestcasesPassed(data.match.second_player_max_testcases_passed);
        console.log("set first-player updates in client");
      }
      if (userId === data.match.second_player.toString()) {   // second-player
        setOpponentSubmissions(data.match.first_player_submissions);
        setOppsCurTestcasesPassed(data.match.first_player_latest_testcases_passed);
        setOppsMaxTestcasesPassed(data.match.first_player_max_testcases_passed);
        console.log("set second-player updates in client");
      }

      // other-user presses submit and they pass all testcases, we should redirect ourselves to
      console.log("found winner: ", data.found_winner); 
      // IMPORTANT: when there is a submission if and only if it found a winner then we redirect to match outcome page FOR REGULAR MATCH, this is hwo we redirect oppponent to match outcome in regular match when other guy submits
      console.log('MatchType: ',matchType );
      if (data.found_winner == true && data.match.type === "regular") {
        // console.log("redirect to match outcome because other person won")
        navigate(`/match-outcome/${match_id}`);
      }
    };
    
    const handleUserMyUpdate = (data) => {
      const userId = getCurrentUser();
      const userIdStr = userId.toString();
      const firstPlayerStr = data.match.first_player.toString();
      const secondPlayerStr = data.match.second_player.toString();
      
      // Update my variables based on which player the current user is
      if (userIdStr === firstPlayerStr) {
          console.log("Updating first player (my) stats");
          setUserSubmissions(data.match.first_player_submissions || 0);
          setUserCurTestcasesPassed(data.match.first_player_latest_testcases_passed || 0);
          setUserMaxTestcasesPassed(data.match.first_player_max_testcases_passed || 0);
      } else if (userIdStr === secondPlayerStr) {
          console.log("Updating second player (my) stats");
          setUserSubmissions(data.match.second_player_submissions || 0);
          setUserCurTestcasesPassed(data.match.second_player_latest_testcases_passed || 0);
          setUserMaxTestcasesPassed(data.match.second_player_max_testcases_passed || 0);
      } else {
          console.error("User ID doesn't match either player");
      }
    }

    const handleMatchTimeExpired = (data) => {
      console.log("match complete due to time expiration: ", data);
      alert(`Time's up! ${data.winner} wins by ${data.win_condition}`);   // pop-up that match 
      navigate(`/match-outcome/${match_id}`);  // redirect to match outcome page
    }
    socketRef.current.on("match_completed_timeout", handleMatchTimeExpired);  // listening for this event emit, which is in index.js when time runs out

  

    // when we get an emit from server do handleOpponentUpdate, it has updated match-obj
    socketRef.current.on("opponent_update", handleOpponentUpdate); 
    socketRef.current.on("user_update", handleUserMyUpdate); 
  

    // cleanup function
    return () => {
      socketRef.current.off("opponent_update", handleOpponentUpdate);
      socketRef.current.off("user_update", handleOpponentUpdate);
      socketRef.current.off('match_completed_timeout', handleMatchTimeExpired);
    };
  }, [match_id]);


  const handleLanguageChange = async (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    // When language changes, load the corresponding template
    // if (problem?.startingCode && languageOptions[newLanguage]) {
    //   const languageId = languageOptions[newLanguage];
    //   const codeTemplate = problem.startingCode[languageId];
    //   if (codeTemplate) {
    //     setSourceCode(codeTemplate);
    //   }
    // }
    console.log("language change new language: ", newLanguage);
    const response = await axios.post(`http://localhost:3001/match/get-match-problem/${match_id}`, {language:newLanguage});  // send some payload language with it
    console.log("handleLanguageChange get-match-problem response data: ", response);
    setProblem(response.data.problem);
    setMatch(response.data.match);
    setSourceCode(response.data.template); 
  };

  // Separate effect to set initial code when problem first loads
  useEffect(() => {
    if (problem?.startingCode && languageOptions[language]) {
      const languageId = languageOptions[language];
      const codeTemplate = problem.startingCode[languageId];
      if (codeTemplate) {
        setSourceCode(codeTemplate);
      }
    }
  }, [problem]); // Only when problem changes, not when language changes



  /* 
  This is for running code against custom input
  */
  const runCode = async () => {
    try{
      const response = await axios.post(`http://localhost:3001/match/run-code`, {sourceCode:sourceCode, customInput:customInput, languageId:languageOptions[language]});
      console.log("Output running code with custom input: " + response.data);
      setOutput(response.data.stdout || response.data.stderr || "Your code produced no output");
      setTime(response.data.time);
      setMemory(response.data.memory);

    } catch (error) {
      setOutput("Error running code with custom input.");
      console.error(error);

      
    } finally {
      setIsLoading(false);
    }
  };

  /* 
  This is for submitting the code against testcases.
  */
  const handleSubmitCode = async (event) => {
    console.log("SUBMITTTTTTTING COOOOODE----------");
    event.preventDefault();
    try {
      console.log("transcript before sending: ", explanationTranscript);
      const result = await axios.post("http://localhost:3001/match/submission", {sourceCode:sourceCode, match_id:match_id, languageId:languageOptions[language], 
                userID:getCurrentUser(), explanation_transcript:explanationTranscript}); // pass in explanation transcript after submission to route

      console.log("match-id: " + match_id);
      console.log("submission results: " + result.data.fir + " out: " + output);
      setOutputInfo(result.data.output_information);

      setOutput(result.data.display_output.split("\n"));
      setTotalTestcases(result.data.total_testcases); // since this is not stored in problem.total_testcaes
      // when handling submission stuff, save cur users testcases passed so we can emit it to the opponent as a progress variable
      // setMyCurTestcases(result.data.num_testcases_passed); 
      // setUserSubmissions(result.data.cur_user_submissions);
      // setUserCurTestcasesPassed(result.data.cur_user_latest_testcases);
      // setUserMaxTestcasesPassed(result.data.cur_user_max_testcases);
      
      const testcases_passed = result.data.output_information.num_testcases_passed;
      console.log("testcases_passed: " + testcases_passed);
      if (socketRef.current) {
        console.log("Emitting get_opponent_update with socket:", socketRef.current.id);

        const userId = getCurrentUser();
        console.log("myCurTestcases before emitting: " + " data: " + result.data.output_information.num_testcases_passed);

        // Emit to get opponent updates
        socketRef.current.emit("get_opponent_update", { match_id, userId, testcases_passed}, (response) => {  // first emit to request for update upon submission
          console.log("get_opponent_update callback:", response);
        });
        
        // Emit to get my cur variables
        socketRef.current.emit("get_my_update", { match_id, userId, testcases_passed}, (response) => {  // first emit to request for update upon submission
          console.log("get_my_update callback:", response);
        });

        
        if (testcases_passed === result.data.total_testcases) {
            if (matchType === "explanation") {
                // Show "I'm Done" button for explanation matches
                // setShowDoneButton(true);
                // setHasCompletedProblem(true);
                alert("Great! Continue explaining. Click 'I'm Done' when you've finished your explanation.");
            } else {
                // regular match - redirect immediately, // when cur-user presses submit and passes testcases redirect them to match outcome page
                if (result.data.found_winner) {
                    navigate(`/match-outcome/${match_id}`);
                }
            }
        }
      }


    } catch (error) {
      // console.error(error.response.data.message);  
    }
  };

  // for explanation match
  const handlePlayerDone = async () => {
    try {
        const response = await axios.post(`http://localhost:3001/match/mark-player-done-explanation-match/${match_id}`, {
            userID: getCurrentUser()
        });

        // emit to player-done event which just notifies other player that they are done through opponent_done
        if (socketRef.current) {
            socketRef.current.emit("player_done", { match_id });
        }

        // redirect to match outcome will show loading state if other player is not done, even they indicate they are done
        navigate(`/match-outcome/${match_id}`);

    } catch (error) {
        console.error("Error marking player as done:", error);
        alert("Error submitting. Redirecting anyway...");
        navigate(`/match-outcome/${match_id}`);
    }
};


  // changes the microphone from on to off vice versa.
  const toggleMicrophone = async () => {
    if (!isMicrophoneOn) {
      // Turning ON - check permissions first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop());
        
        // Permission granted, turn on microphone
        setIsMicrophoneOn(true);
        setMicrophoneError(null);
        console.log("✅ Microphone permission granted");
      } catch (error) {
        console.error("Microphone permission error:", error);
        if (error.name === 'NotAllowedError') {
          setMicrophoneError("Microphone access denied. Please allow microphone access in your browser settings.");
        } else if (error.name === 'NotFoundError') {
          setMicrophoneError("No microphone found. Please connect a microphone.");
        } else {
          setMicrophoneError("Could not access microphone. Please check your settings.");
        }
        setIsMicrophoneOn(false);
      }
    } else {
      // Turning OFF - just stop
      setIsMicrophoneOn(false);
      setMicrophoneError(null);
    }
  };

  // SPEECH->TEXT USEFFECT:
  useEffect(() => {
    // Only initialize if it's an explanation match AND microphone is turned on
    if (matchType !== "explanation" || !isMicrophoneOn) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Error stopping recognition:", e);
        }
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicrophoneError("Speech Recognition API not supported in this browser");
      return;
    }

    let isActive = true; // Flag to prevent restart loops

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let newFinalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinalText += transcriptPart + " ";
        }
      }

      if (newFinalText) {
        console.log("📝 Captured speech:", newFinalText);
        setExplanationTranscript(prev => prev + newFinalText);
        setMicrophoneError(null); // Clear error on successful speech
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      
      // Handle different error types
      switch(event.error) {
        case 'no-speech':
          // Don't show error for no-speech, just keep listening
          console.log("No speech detected, still listening...");
          // Don't set isActive to false, keep listening
          break;
        case 'audio-capture':
          console.log("Audio capture issue - microphone may be in use by another app");
          setMicrophoneError("Microphone unavailable. Check if another app is using it.");
          setIsMicrophoneOn(false);
          isActive = false;
          break;
        case 'not-allowed':
          console.log("Microphone permission denied");
          setMicrophoneError("Microphone access denied. Click the mic button to grant permission.");
          setIsMicrophoneOn(false);
          isActive = false;
          break;
        case 'network':
          console.log("Network error during speech recognition");
          setMicrophoneError("Network error occurred. Please check your connection.");
          // Don't disable mic, might be temporary
          break;
        case 'aborted':
          // User stopped or another interruption
          console.log("Speech recognition aborted");
          isActive = false;
          break;
        case 'service-not-allowed':
          console.log("Speech recognition service not allowed");
          setMicrophoneError("Speech recognition not allowed. Check browser settings.");
          setIsMicrophoneOn(false);
          isActive = false;
          break;
        default:
          console.log(`Unknown speech recognition error: ${event.error}`);
          setMicrophoneError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      // Only restart if still active and mounted
      if (isActive && isMicrophoneOn && matchType === "explanation") {
        console.log("Restarting recognition...");
        setTimeout(() => {
          try {
            if (recognitionRef.current) {
              recognition.start();
            }
          } catch (error) {
            console.error("Error restarting recognition:", error);
          }
        }, 100); // Small delay to prevent rapid restart loops
      }
    };

    recognition.onstart = () => {
      console.log("🎤 Speech recognition started");
      setMicrophoneError(null);
    };

    const initializeRecognition = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 200)); // Ensure cleanup completes
        recognition.start();
        recognitionRef.current = recognition;
        console.log("Initializing speech recognition...");
      } catch (error) {
        console.error("Error starting recognition:", error);
        if (error.message.includes('already started')) {
          console.log("Recognition already running, skipping...");
        } else {
          setMicrophoneError("Failed to start speech recognition. Try again.");
          setIsMicrophoneOn(false);
        }
      }
    };

    initializeRecognition();

    return () => {
      console.log("Cleanup: stopping recognition");
      isActive = false; // Prevent restarts during cleanup
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Error during cleanup:", e);
        }
        recognitionRef.current = null;
      }
    };
  }, [matchType, isMicrophoneOn]);


  console.log("outputinfo: ", outputInfo);
  return (
    <div className={`h-screen bg-[#1E1E1E] text-white ${isCountdownActive ? 'pointer-events-none' : ''}`}>
      <div className="flex h-full">
        <div className="w-full md:w-1/2 lg:w-1/3 p-4 bg-[#1E1E1E] border-r border-[#333333] overflow-auto">
          <div className="bg-[#2D2D2D] rounded-lg p-6 h-full">
            <div className="flex items-center mb-4">
              <h2 className="text-lg font-semibold">Problem: {problem.title}</h2>
              <span className="ml-2 text-green-500">• EASY</span>
            </div>
            <div className="text-[#CCCCCC] mb-6">
              <h4>Description: {problem.description}</h4>
              <div className="m-6">
                <div className="p-4 bg-[#1E1E1E] border-r border-[#333333]">
                  <h3 className="text-[#CCCCCC] font-semibold mb-2">EXAMPLES:</h3>
                  {problem.examples}

                </div>
              </div>         
            </div>
          </div>
        </div>
        <div className={`p-4 bg-[#1E1E1E] border-r border-[#333333] overflow-auto ${showOpponentBox ? 'w-full md:w-1/2 lg:w-1/3' : 'w-full md:w-2/3 lg:w-2/3'}`}>
          <div className="bg-[#2D2D2D] rounded-lg p-2 h-full">
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setShowOpponentBox(!showOpponentBox)} 
                className="px-3 py-1 bg-[#333333] text-white rounded hover:bg-[#444444] transition-colors"
                title={showOpponentBox ? "Hide opponent" : "Show opponent"}
                disabled={isCountdownActive}
              >
                <span className="text-xl font-bold">
                  {showOpponentBox ? "←" : "→"}
                </span>
              </button>
              <button 
                onClick={() => {}} 
                className="px-4 py-1 bg-[#333333] text-white rounded"
                disabled={isCountdownActive}
              >
                <h3 className="text-md font-semibold">FORFIT</h3>
              </button>
              <button 
                className="px-4 py-1 bg-green-600 text-white rounded text-md font-semibold" 
                disabled={isLoading || isCountdownActive} 
                onClick={runCode}
              >
                {isLoading ? "Running..." : "RUN CODE"}
              </button>
              <button 
                className="px-4 py-1 bg-red-600 text-white rounded text-md font-semibold" 
                disabled={isLoading || isCountdownActive} 
                onClick={handleSubmitCode}
              >
                {isLoading ? "Running..." : "SUBMIT"}
              </button>
            </div>
            <label className="text-sm font-semibold">Language: </label>
            <select
              value={language}
              className="border p-3 rounded bg-transparent"
              onChange={handleLanguageChange} // usese the custom handler instead of setLanguage
              disabled={isCountdownActive}
            >
              {Object.keys(languageOptions).map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            
            {/* MICROPHONE BUTTON */}
            {matchType === "explanation" && (
              <div className="flex items-center space-x-2 ml-4">
                <button 
                  onClick={toggleMicrophone}
                  className={`px-4 py-1 rounded text-md font-semibold flex items-center space-x-2 ${
                    isMicrophoneOn 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                  disabled={isCountdownActive}
                >
                  <span>{isMicrophoneOn ? '🎤 Stop Recording' : '🎤 Start Recording'}</span>
                </button>
                {isMicrophoneOn && (
                  <span className="text-green-500 animate-pulse">● Recording...</span>
                )}
              </div>
            )}


            {matchType === "explanation" && (
                <button 
                    className="px-4 py-1 bg-green-600 text-white rounded text-md font-semibold" 
                    onClick={handlePlayerDone}
                >
                    ✓ I'M DONE
                </button>
            )}

            {/* SHOW MICROPHONE ERROS */}
            {microphoneError && (
              <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
                {microphoneError}
              </div>
            )}

            {/* SHOW TRANSCRIPT PREVIEW */}
            {matchType === "explanation"  && explanationTranscript && (
              <div className="mt-4 p-3 bg-[#1E1E1E] rounded border border-[#444444]">
                <h3 className="text-sm font-semibold mb-2">Your Explanation Transcript:</h3>
                <p className="text-xs text-[#CCCCCC] max-h-20 overflow-y-auto">
                  {explanationTranscript}
                </p>
              </div>
            )}
            <Editor
              className="mt-4 rounded"
              height="500px"
              defaultLanguage={language}
              language={language}
              value={sourceCode}
              onChange={(value) => setSourceCode(value)}
              theme="vs-dark"
              options={{ readOnly: isCountdownActive }}
            />
            <textarea
              placeholder="Custom input (stdin)"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="w-full bg-[#2D2D2D] h-20 border p-2 font-mono rounded mt-6"
              disabled={isCountdownActive}
            />
            <div className="mt-4">
              <h2 className="font-bold text-lg">Output:</h2>
              {/* Runtime Error Display */}
              {outputInfo.status === 11 && (
                <div className="bg-red-100 text-red-700 p-3 rounded">
                  <h4>Runtime Error LIL BRO</h4>
                  <pre>{outputInfo.stderr ?? outputInfo.compileOutput}</pre>
                  <h4>First FAILED Testcase</h4>
                  <h4>INPUT: {outputInfo.first_failed_tc_inp}</h4>
                  <h4>OUTPUT: {outputInfo.first_failed_tc_output}</h4>
                  <h4>YOUR OUTPUT: {outputInfo.first_failed_tc_user_output}</h4>
                </div>
              )}
              {/* Success No-Error Display */}
              {outputInfo.status === 3 && (
                <div className="bg-green-100 text-green-800 p-3 rounded">
                  🆗 Code Compiled Sucessfully – {outputInfo.num_testcases_passed}/{outputInfo.total_testcases} 
                  <h4>First FAILED Testcase</h4>
                  <h4>INPUT: {outputInfo.first_failed_tc_inp}</h4>
                  <h4>OUTPUT: {outputInfo.first_failed_tc_output}</h4>
                  <h4>YOUR OUTPUT: {outputInfo.first_failed_tc_user_output}</h4>
                </div>
              )}

              <div style={{ height: "9vh", padding: "0.5rem", color: isError ? "green" : "", border: "1px solid", borderRadius: "0.25rem", borderColor: isError ? "#" : "#" }}>
                Time: {time} ms, Memory: {memory} kb
                {Array.isArray(output) ? (
                  output.map((line, index) => <div key={index}>{line}</div>)
                ) : (
                  <pre>{}</pre>
                )}
              </div>
              <pre className="p-4 rounded whitespace-pre-wrap">
                {output}
              </pre>
            </div>
          </div>
        </div>
        {showOpponentBox && (
          <div className="w-full md:w-1/2 lg:w-1/3 p-4 bg-[#1E1E1E] border-r border-[#333333] overflow-auto">
            <div className="bg-[#2D2D2D] rounded-lg p-2 h-full">
              <MatchTimer 
                match_id={match_id}
                socketRef={socketRef}
              />
              <h2 className="text-lg">Opponent Submissions: {opponentSubmissions}</h2>
              <h2>Opponent Latest Testcases Passed: {oppsCurTestcasesPassed}/{totalTestcases}</h2>
              <h2>Opponent Max Testcases Passed: {oppsMaxTestcasesPassed}/{totalTestcases}</h2>
              <br></br>
              <h2>My Submissions: {userSubmissions}</h2>
              <h2>My Latest Testcassed Passed: {userCurTestcasesPassed}/{totalTestcases}</h2>
              <h2>My Max Testcases Passed: {userMaxTestcasesPassed}/{totalTestcases}</h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default CodeEditor;