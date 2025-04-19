import { useRef, useState, useEffect } from "react";
import { Box, HStack } from "@chakra-ui/react";
import { Editor } from "@monaco-editor/react";
import { CODE_SNIPPETS, theme } from "../constants/api";
import  getCurrentUser  from "../hooks/getCurrentUser";
import axios from "axios";
import io from "socket.io-client";
const socket = io.connect("http://localhost:3001"); 


const languageOptions = {
  javascript: 63,
  python: 71,
  "c++": 54,
  java: 62,
};



/* 
Custom input has to be like:
1 2 3
9

Code: nums = list(map(int, input().split())) 
*/

const CodeEditor = ({ match_id }) => {
  const editorRef = useRef();
  const [sourceCode, setSourceCode] = useState("nums = list(map(int, input().split()))\ntarget = int(input())\n\ndef two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            return [lookup[diff], i]\n        lookup[num] = i\n\nresult = two_sum(nums, target)\nprint(result)");
  const [customInput, setCustomInput] = useState("");
  const [language, setLanguage] = useState("python");
  const [problem, setProblem] = useState({});
  

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
  
  // Use ref to maintain socket instance, because during navigation socket.id changes. Maintains same ref through out component life cycle
  const socketRef = useRef(null); 


  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const fetchProblem = async (event) => {
    try {
      // this is slowing down application have to fetch problem, every time so store match in cache. 
      const response = await axios.get(`http://localhost:3001/match/get-match-problem/${match_id}`);
      setProblem(response.data.problem);
      console.log(response.data.problem);
    } catch (error) {
      console.error(error.response.data.message);  
    }
  };

  useEffect(() => {
    fetchProblem();


    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3001");
      console.log("creating new socket connection client:", socketRef.current.id);
    }
    socketRef.current.emit("rejoin_match", { match_id }); // if their socket cahnges rejoin-match

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

      // setOpponentSubmissions(data.oppSubs);
    };
    // when we get an emit from server do handleOpponentUpdate, it has updated match-obj
    socketRef.current.on("opponent_update", handleOpponentUpdate); 

    // cleanup function
    return () => {
      socketRef.current.off("opponent_update", handleOpponentUpdate);
    };
  }, [match_id]);



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
      const result = await axios.post("http://localhost:3001/match/submission", {sourceCode:sourceCode, match_id:match_id, languageId:languageOptions[language]});
      console.log("match-id: " + match_id);
      console.log("submission results: " + result.data + " out: " + output);
      setOutput(result.data.display_output.split("\n"));
      setTotalTestcases(result.data.total_testcases); // since this is not stored in problem.total_testcaes
      // when handling submission stuff, save cur users testcases passed so we can emit it to the opponent as a progress variable
      // setMyCurTestcases(result.data.num_testcases_passed); 
      
      const testcases_passed = result.data.num_testcases_passed;
      console.log("testcases_passed: " + testcases_passed);
      if (socketRef.current) {
        console.log("Emitting get_opponent_update with socket:", socketRef.current.id);

        const userId = getCurrentUser();
        console.log("myCurTestcases before emitting: " + " data: " + result.data.num_testcases_passed);
        socketRef.current.emit("get_opponent_update", { match_id, userId, testcases_passed}, (response) => {  // first emit to request for update upon submission
          console.log("get_opponent_update callback:", response);
        });
      }


    } catch (error) {
      // console.error(error.response.data.message);  
    }
  };



  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h2>Opponent Submissions: {opponentSubmissions}</h2>
      <h2>Opponent Latest Testcases Passed: {oppsCurTestcasesPassed}/{totalTestcases}</h2>
      <h2>Opponent Max Testcases Passed: {oppsMaxTestcasesPassed}/{totalTestcases}</h2>
      <div className="flex items-center gap-4">
        <h3>Problem: {problem.title}</h3>
        <h4>Description: {problem.description}</h4>
        <label className="text-sm font-semibold">Language:</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border p-1 rounded"
        >
          {Object.keys(languageOptions).map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <Editor
        height="400px"
        defaultLanguage={language}
        language={language}
        value={sourceCode}
        onChange={(value) => setSourceCode(value)}
        theme="vs-dark"
      />

      <textarea
        placeholder="Custom input (stdin)"
        value={customInput}
        onChange={(e) => setCustomInput(e.target.value)}
        className="w-full h-20 border p-2 font-mono rounded"
      />


      <div className="mt-4">
        <h2 className="font-bold text-lg">Output:</h2>
        <button style={{ border: "1px solid green",color: "green",padding: "0.5rem 1rem",marginBottom: "1rem",backgroundColor: "transparent",borderRadius: "0.25rem"}}  disabled={isLoading} onClick={runCode}>
          {isLoading ? "Running..." : "Run Code"}
        </button>

  <button
    onClick={handleSubmitCode}
    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    {isLoading ? "Running..." : "Submit Code"}
  </button>

  <div style={{ height: "75vh",padding: "0.5rem",color: isError ? "#fc8181" : "",border: "1px solid",borderRadius: "0.25rem",borderColor: isError ? "#f56565" : "#333"}}>
    Time: {time} ms, Memory: {memory} kb
    {Array.isArray(output) ? (
      output.map((line, index) => <div key={index}>{line}</div>)
    ) : (
      <pre>{output}</pre>
    )}
  </div>

  <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">
          {output}
  </pre>

      </div>
    </div>
  );
};


export default CodeEditor;
