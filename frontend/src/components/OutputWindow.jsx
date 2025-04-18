import { useState, useEffect, useRef } from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { executeCode } from "../constants/api";
import axios from "axios";
import io from "socket.io-client";
import  getCurrentUser  from "../hooks/getCurrentUser";
// connect to server from client-side establishes socketio connection with backend running on 3001
const socket = io.connect("http://localhost:3001"); 


const languageOptions = {
  javascript: 63,
  python: 71,
  "c++": 54,
  java: 62,
};


const OutputWindow = ({ match_id, match, sourceCode, customInput,  language }) => {
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

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3001");
      console.log("creating new socket connection client:", socketRef.current.id);
    }
    
    socketRef.current.emit("rejoin_match", { match_id });
  
    // update the opponent variables for display on client-side, this
    const handleOpponentUpdate = (data) => {
      console.log("Handle Opponent Update func: ", data);
      console.log("Received match data:", data.match);
      
      if (!data.match) return;
      
      const currentUserId = getCurrentUser();
      if (!currentUserId) return;
  
      // comapre as strings since MongoDB ObjectIds come as objects
      const isFirstPlayer = data.match.first_player && data.match.first_player.toString() === currentUserId.toString();
      
      console.log("Current user ID:", currentUserId);
      console.log("Is first player:", isFirstPlayer);
      
      if (isFirstPlayer) {
        setOpponentSubmissions(data.match.second_player_submissions || 0);
        setOppsCurTestcasesPassed(data.match.second_player_latest_testcases_passed || 0);
        setOppsMaxTestcasesPassed(data.match.second_player_max_testcases_passed || 0);
      } else {
        setOpponentSubmissions(data.match.first_player_submissions || 0);
        setOppsCurTestcasesPassed(data.match.first_player_latest_testcases_passed || 0);
        setOppsMaxTestcasesPassed(data.match.first_player_max_testcases_passed || 0);
      }
      
      console.log("Updated opponent submissions:", isFirstPlayer ? 
        data.match.second_player_submissions : data.match.first_player_submissions);
    };
  
    // this is listening for updated match object.
    socketRef.current.on("opponent_update", handleOpponentUpdate);
  
    return () => {
      socketRef.current.off("opponent_update", handleOpponentUpdate);
    };
  }, [match_id]);

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

    
  );
};


export default OutputWindow;