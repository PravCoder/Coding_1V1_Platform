import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Editor } from "@monaco-editor/react";
import axios from "axios";
import io from "socket.io-client";

import getCurrentUser from "../hooks/getCurrentUser";
import MatchTimer from "./MatchTimer";
import MatchProgressGraph from "./MatchProgressGraph";

// Language map (Judge0 IDs)
const languageOptions = {
  python: 71,
  cpp: 54,
  // java: 62,
};

const CodeEditor = ({ match_id }) => {
  const editorRef = useRef(null);
  const editorContainerRef = useRef(null);
  const navigate = useNavigate();

  // (Optional) Filter noisy ResizeObserver errors from Chrome dev console
  useEffect(() => {
    const errFilter = (e) => {
      const msg = e?.message || "";
      if (
        msg.includes("ResizeObserver loop limit exceeded") ||
        msg.includes("ResizeObserver loop completed with undelivered notifications")
      ) {
        e.preventDefault?.();
        e.stopImmediatePropagation?.();
        return false;
      }
    };
    window.addEventListener("error", errFilter);
    return () => window.removeEventListener("error", errFilter);
  }, []);

  // Match state
  const [match, setMatch] = useState({});
  const [matchType, setMatchType] = useState({});

  // Problem + code
  const [language, setLanguage] = useState("python");
  const [problem, setProblem] = useState({});
  const [sourceCode, setSourceCode] = useState("");
  const [customInput, setCustomInput] = useState("");

  // UI state
  const [showOpponentBox, setShowOpponentBox] = useState(true);
  const [isCountdownActive, setIsCountdownActive] = useState(false);

  // Output / run
  const [outputInfo, setOutputInfo] = useState({});
  const [output, setOutput] = useState(null);
  const [time, setTime] = useState(null);
  const [memory, setMemory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  // Opponent + user progress
  const [opponentSubmissions, setOpponentSubmissions] = useState(0);
  const [oppsCurTestcasesPassed, setOppsCurTestcasesPassed] = useState(0);
  const [oppsMaxTestcasesPassed, setOppsMaxTestcasesPassed] = useState(0);
  const [totalTestcases, setTotalTestcases] = useState(0);

  const [userSubmissions, setUserSubmissions] = useState(0);
  const [userCurTestcasesPassed, setUserCurTestcasesPassed] = useState(0);
  const [userMaxTestcasesPassed, setUserMaxTestcasesPassed] = useState(0);

  // Speech (explanation mode)
  const [explanationTranscript, setExplanationTranscript] = useState("");
  const recognitionRef = useRef(null);

  // Timer / match start
  const [isMatchStarted, setIsMatchStarted] = useState(() => {
    return !!localStorage.getItem("match_start_time");
  });
  const [shouldRestartTimer, setShouldRestartTimer] = useState(false);
  const [matchStartTime, setMatchStartTime] = useState(() => {
    const saved = localStorage.getItem("match_start_time");
    return saved ? new Date(saved) : null;
  });

  const handleCountdownComplete = (newStartTime) => {
    setMatchStartTime(newStartTime);
    localStorage.setItem("match_start_time", newStartTime.toISOString());
  };

  // Maintain a single socket instance for the lifetime of the component
  const socketRef = useRef(null);

  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
    // Ensure initial layout with proper dimensions
    setTimeout(() => {
      try {
        editor.layout();
      } catch {}
    }, 100);
  };

  const fetchProblem = async () => {
    try {
      const response = await axios.post(
        `http://localhost:3001/match/get-match-problem/${match_id}`,
        { language }
      );
      setProblem(response.data.problem || {});
      setMatch(response.data.match || {});
      setSourceCode(response.data.template || "");
      setTotalTestcases(response.data?.problem?.testcases?.length || 0);
      setMatchType(response.data?.match?.type || "regular");
    } catch (error) {
      console.error("Failed to fetch problem:", error?.response?.data || error);
    }
  };

  // Initial load, socket setup, and listeners
  useEffect(() => {
    fetchProblem();

    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3001");
    }
    socketRef.current.emit("rejoin_match", { match_id });

    const handleOpponentUpdate = (data) => {
      const userId = getCurrentUser();
      if (userId === data.match.first_player.toString()) {
        setOpponentSubmissions(data.match.second_player_submissions);
        setOppsCurTestcasesPassed(
          data.match.second_player_latest_testcases_passed
        );
        setOppsMaxTestcasesPassed(
          data.match.second_player_max_testcases_passed
        );
      } else if (userId === data.match.second_player.toString()) {
        setOpponentSubmissions(data.match.first_player_submissions);
        setOppsCurTestcasesPassed(
          data.match.first_player_latest_testcases_passed
        );
        setOppsMaxTestcasesPassed(data.match.first_player_max_testcases_passed);
      }

      if (data.found_winner === true) {
        navigate(`/match-outcome/${match_id}`);
      }
    };

    const handleUserMyUpdate = (data) => {
      const userId = getCurrentUser().toString();
      const firstId = data.match.first_player.toString();
      const secondId = data.match.second_player.toString();

      if (userId === firstId) {
        setUserSubmissions(data.match.first_player_submissions || 0);
        setUserCurTestcasesPassed(
          data.match.first_player_latest_testcases_passed || 0
        );
        setUserMaxTestcasesPassed(
          data.match.first_player_max_testcases_passed || 0
        );
      } else if (userId === secondId) {
        setUserSubmissions(data.match.second_player_submissions || 0);
        setUserCurTestcasesPassed(
          data.match.second_player_latest_testcases_passed || 0
        );
        setUserMaxTestcasesPassed(
          data.match.second_player_max_testcases_passed || 0
        );
      } else {
        console.error("User ID doesn't match either player");
      }
    };

    const handleMatchTimeExpired = (data) => {
      alert(`Time's up! ${data.winner} wins by ${data.win_condition}`);
      navigate(`/match-outcome/${match_id}`);
    };

    socketRef.current.on("opponent_update", handleOpponentUpdate);
    socketRef.current.on("user_update", handleUserMyUpdate);
    socketRef.current.on("match_completed_timeout", handleMatchTimeExpired);

    return () => {
      if (!socketRef.current) return;
      socketRef.current.off("opponent_update", handleOpponentUpdate);
      socketRef.current.off("user_update", handleUserMyUpdate);
      socketRef.current.off("match_completed_timeout", handleMatchTimeExpired);
    };
  }, [match_id]);

  // Auto-start match after a short delay
  useEffect(() => {
    if (isMatchStarted) return;
    const timer = setTimeout(() => {
      setIsMatchStarted(true);
      localStorage.removeItem("match_start_time");
      setMatchStartTime(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isMatchStarted]);

  const handleRestartMatch = () => {
    setShouldRestartTimer(true);
    setIsMatchStarted(false);
    setTimeout(() => {
      setShouldRestartTimer(false);
      setIsMatchStarted(true);
    }, 100);
  };

  // Clean up stored timer when unmounting
  useEffect(() => {
    return () => {
      if (!isMatchStarted) {
        localStorage.removeItem("match_start_time");
      }
    };
  }, [isMatchStarted]);

  // When problem changes, set initial template
  useEffect(() => {
    if (problem?.startingCode && languageOptions[language]) {
      const languageId = languageOptions[language];
      const codeTemplate = problem.startingCode[languageId];
      if (codeTemplate) {
        setSourceCode(codeTemplate);
      }
    }
  }, [problem, language]);

  const handleLanguageChange = async (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    try {
      const response = await axios.post(
        `http://localhost:3001/match/get-match-problem/${match_id}`,
        { language: newLanguage }
      );
      setProblem(response.data.problem || {});
      setMatch(response.data.match || {});
      setSourceCode(response.data.template || "");
      setTotalTestcases(response.data?.problem?.testcases?.length || 0);

      // Layout editor after language change
      setTimeout(() => {
        try {
          editorRef.current?.layout();
        } catch {}
      }, 100);
    } catch (err) {
      console.error("Failed to switch language:", err?.response?.data || err);
    }
  };

  // Run with custom input
  const runCode = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await axios.post(
        `http://localhost:3001/match/run-code`,
        {
          sourceCode,
          customInput,
          languageId: languageOptions[language],
        }
      );
      setOutput(response.data.stdout || response.data.stderr || "No output");
      setTime(response.data.time);
      setMemory(response.data.memory);
    } catch (error) {
      setOutput("Error running code with custom input.");
      setIsError(true);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit vs testcases
  const handleSubmitCode = async (event) => {
    event.preventDefault();
    try {
      const result = await axios.post(
        "http://localhost:3001/match/submission",
        {
          sourceCode,
          match_id,
          languageId: languageOptions[language],
          userID: getCurrentUser(),
        }
      );

      setOutputInfo(result.data.output_information || {});
      setOutput(result.data.display_output?.split("\n") || []);
      setTotalTestcases(result.data.total_testcases || 0);

      const testcases_passed =
        result.data.output_information?.num_testcases_passed ?? 0;

      if (socketRef.current) {
        const userId = getCurrentUser();
        socketRef.current.emit(
          "get_opponent_update",
          { match_id, userId, testcases_passed },
          () => {}
        );
        socketRef.current.emit(
          "get_my_update",
          { match_id, userId, testcases_passed },
          () => {}
        );
      }

      if (result.data.found_winner === true) {
        navigate(`/match-outcome/${match_id}`);
      }

      // Layout editor after DOM settles
      setTimeout(() => {
        try {
          editorRef.current?.layout();
        } catch {}
      }, 100);
    } catch (error) {
      console.error("Submission failed:", error?.response?.data || error);
    }
  };

  // Explanation mode speech recognition
  useEffect(() => {
    if (matchType !== "explanation") {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition API not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let newFinalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) newFinalText += transcriptPart + " ";
      }
      if (newFinalText) {
        setExplanationTranscript((prev) => prev + newFinalText);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
    };

    recognition.start();
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [matchType]);

  // Improved ResizeObserver with debouncing
  useEffect(() => {
    if (!editorContainerRef.current) return;

    let timeoutId = null;
    const ro = new ResizeObserver((entries) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          editorRef.current?.layout();
        } catch {}
      }, 16); // ~60fps
    });
    
    ro.observe(editorContainerRef.current);

    return () => {
      ro.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Layout when toggling opponent panel
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        editorRef.current?.layout();
      } catch {}
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [showOpponentBox]);

  return (
    <div
      className={`h-screen bg-[#1E1E1E] text-white ${
        isCountdownActive ? "pointer-events-none" : ""
      }`}
    >
      {/* Fixed height grid with proper proportions */}
      <div className="h-full grid grid-cols-12 gap-0">
        {/* LEFT: Problem Panel */}
        <div className="col-span-12 md:col-span-4 border-r border-[#333333] bg-[#1E1E1E] overflow-hidden">
          <div className="h-full bg-[#2D2D2D] p-6 flex flex-col">
            <div className="flex items-center mb-4">
              <h2 className="text-lg font-semibold truncate">
                Problem: {problem?.title || "Loading..."}
              </h2>
              <span className="ml-2 text-green-500">• EASY</span>
            </div>

            <div className="text-[#CCCCCC] flex-1 overflow-auto min-w-0">
              <h4 className="mb-4">
                Description: {problem?.description || "—"}
              </h4>
              <div className="p-4 bg-[#1E1E1E] border border-[#333333] rounded">
                <h3 className="text-[#CCCCCC] font-semibold mb-2">EXAMPLES:</h3>
                <div className="whitespace-pre-wrap break-words">
                  {problem?.examples || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE: Editor Panel */}
        <div
          className={`col-span-12 ${
            showOpponentBox ? "md:col-span-4" : "md:col-span-8"
          } border-r border-[#333333] bg-[#1E1E1E] overflow-hidden min-w-0`}
        >
          <div className="h-full bg-[#2D2D2D] p-2 flex flex-col min-w-0">
            {/* Controls */}
            <div className="flex justify-end items-center gap-2 shrink-0">
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

            {/* Language */}
            <div className="mt-2 shrink-0">
              <label className="text-sm font-semibold mr-2">Language:</label>
              <select
                value={language}
                className="border p-2 rounded bg-transparent"
                onChange={handleLanguageChange}
                disabled={isCountdownActive}
              >
                {Object.keys(languageOptions).map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Editor + IO */}
            <div className="mt-2 flex-1 min-h-0 flex flex-col min-w-0">
              {/* Editor with fixed height */}
              <div
                ref={editorContainerRef}
                className="flex-1 min-h-0 rounded overflow-hidden"
                style={{ minHeight: '300px', height: 'calc(100% - 200px)' }}
              >
                <Editor
                  onMount={onMount}
                  height="100%"
                  width="100%"
                  language={language}
                  value={sourceCode}
                  onChange={(v) => setSourceCode(v ?? "")}
                  theme="vs-dark"
                  options={{
                    automaticLayout: false,
                    readOnly: isCountdownActive,
                    wordWrap: "on",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                />
              </div>

              {/* Custom input */}
              <textarea
                placeholder="Custom input (stdin)"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="w-full bg-[#2D2D2D] h-20 border p-2 font-mono rounded mt-3 resize-none"
                disabled={isCountdownActive}
              />

              {/* Output */}
              <div className="mt-3">
                <h2 className="font-bold text-lg">Output:</h2>

                {outputInfo.status === 11 && (
                  <div className="bg-red-100 text-red-700 p-3 rounded">
                    <h4 className="font-semibold">Runtime Error</h4>
                    <pre className="whitespace-pre-wrap break-words">
                      {outputInfo.stderr ?? outputInfo.compileOutput}
                    </pre>
                    <h4 className="mt-2 font-semibold">First FAILED Testcase</h4>
                    <div className="text-sm">
                      <div>INPUT: {outputInfo.first_failed_tc_inp}</div>
                      <div>OUTPUT: {outputInfo.first_failed_tc_output}</div>
                      <div>
                        YOUR OUTPUT: {outputInfo.first_failed_tc_user_output}
                      </div>
                    </div>
                  </div>
                )}

                {outputInfo.status === 3 && (
                  <div className="bg-green-100 text-green-800 p-3 rounded">
                    🆗 Code Compiled Successfully –{" "}
                    {outputInfo.num_testcases_passed}/{outputInfo.total_testcases}
                    <h4 className="mt-2 font-semibold">First FAILED Testcase</h4>
                    <div className="text-sm">
                      <div>INPUT: {outputInfo.first_failed_tc_inp}</div>
                      <div>OUTPUT: {outputInfo.first_failed_tc_output}</div>
                      <div>
                        YOUR OUTPUT: {outputInfo.first_failed_tc_user_output}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-2 border rounded p-2 bg-[#1E1E1E] text-white" style={{ height: "80px", overflow: "auto" }}>
                  <div className="text-sm text-gray-400">
                    Time: {time} ms, Memory: {memory} kb
                  </div>
                  {Array.isArray(output) ? (
                    output.map((line, index) => <div key={index} className="text-sm">{line}</div>)
                  ) : (
                    <pre className="whitespace-pre-wrap break-words text-sm">
                      {output ?? ""}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Opponent Panel */}
        {showOpponentBox && (
          <div className="col-span-12 md:col-span-4 bg-[#1E1E1E] overflow-hidden">
            <div className="h-full bg-[#2D2D2D] p-2 flex flex-col">
              <div className="shrink-0">
                <MatchTimer match_id={match_id} socketRef={socketRef} />
              </div>
              <div className="flex-1 overflow-auto">
                <MatchProgressGraph
                  userSubmissions={userSubmissions}
                  userCurTestcasesPassed={userCurTestcasesPassed}
                  userMaxTestcasesPassed={userMaxTestcasesPassed}
                  totalTestcases={totalTestcases}
                  opponentSubmissions={opponentSubmissions}
                  oppsCurTestcasesPassed={oppsCurTestcasesPassed}
                  oppsMaxTestcasesPassed={oppsMaxTestcasesPassed}

                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;

