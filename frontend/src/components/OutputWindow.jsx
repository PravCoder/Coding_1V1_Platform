import { useState, useEffect, useRef } from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { executeCode } from "../constants/api";
import axios from "axios";
import io from "socket.io-client";
import  getCurrentUser  from "../hooks/getCurrentUser";
// connect to server from client-side establishes socketio connection with backend running on 3001
const socket = io.connect("http://localhost:3001"); 

const JUDGE0_API_URL =
  "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true";

const JUDGE0_HEADERS = {
  "content-type": "application/json",
  "X-RapidAPI-Key": "66d7e1c7fdmshfe0777fc665b15fp1b48e1jsn53a1a23ac192", // Replace with your key
  "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
};
const languageOptions = {
  javascript: 63,
  python: 71,
  "c++": 54,
  java: 62,
};


const OutputWindow = ({ match_id, sourceCode, customInput,  language }) => {
  // const toast = useToast();
  const [output, setOutput] = useState(null);
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


  /* 
  This is for running code against custom input
  */
  const runCode = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        JUDGE0_API_URL,
        {
          source_code: sourceCode,
          stdin: customInput,
          language_id: languageOptions[language],
        },
        {
          headers: JUDGE0_HEADERS,
        }
      );
      setOutput(response.data.stdout || response.data.stderr || "No output");
    } catch (error) {
      setOutput("Error running code.");
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
      const result = await axios.post("http://localhost:3001/match/submission", {source_code:sourceCode, match_id:match_id});
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

  useEffect(() => {
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
  
  }, [match_id])

  return (
    <div style={{ width: "50%" }}>
  <h2>Opponent Submissions: {opponentSubmissions}</h2>
  <h2>Opponent Latest Testcases Passed: {oppsCurTestcasesPassed}/{totalTestcases}</h2>
  <h2>Opponent Max Testcases Passed: {oppsMaxTestcasesPassed}/{totalTestcases}</h2>

  <p style={{ marginBottom: "0.5rem", fontSize: "1.125rem" }}>Output</p>

  <button
    style={{
      border: "1px solid green",
      color: "green",
      padding: "0.5rem 1rem",
      marginBottom: "1rem",
      backgroundColor: "transparent",
      borderRadius: "0.25rem"
    }}
    disabled={isLoading}
    onClick={runCode}
  >
    {isLoading ? "Running..." : "Run Code"}
  </button>

  <button
    onClick={runCode}
    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    {isLoading ? "Running..." : "Run Code"}
  </button>

  <div
    style={{
      height: "75vh",
      padding: "0.5rem",
      color: isError ? "#fc8181" : "",
      border: "1px solid",
      borderRadius: "0.25rem",
      borderColor: isError ? "#f56565" : "#333"
    }}
  >
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

    
  );
};


export default OutputWindow;