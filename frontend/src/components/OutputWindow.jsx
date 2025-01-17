import { useState, useEffect, useRef } from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { executeCode } from "../constants/api";
import axios from "axios";
import io from "socket.io-client";
import  getCurrentUser  from "../hooks/getCurrentUser";
// connect to server from client-side establishes socketio connection with backend running on 3001
const socket = io.connect("http://localhost:3001"); 


const OutputWindow = ({ match_id, editorRef, language, input }) => {
  // const toast = useToast();
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  // opponent progress variables
  const [opponentSubmissions, setOpponentSubmissions] = useState(0);
  const [oppsCurTestcasesPassed, setOppsCurTestcasesPassed] = useState(0);
  // cur users variables
  const [myCurTestcases, setMyCurTestcases] = useState(0);
  // Use ref to maintain socket instance, because during navigation socket.id changes. Maintains same ref through out component life cycle
  const socketRef = useRef(null); 

  const runCode = async () => {
    const sourceCode = editorRef.current.getValue();
    if (!sourceCode) return;
    try {
      setIsLoading(true);
      const { run: result } = await executeCode(language, sourceCode, input); // pass custom input
      setOutput(result.output.split("\n")); //set output, split by new line
      result.stderr ? setIsError(true) : setIsError(false);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCode = async (event) => {
    event.preventDefault();
    try {
      const sourceCode = editorRef.current.getValue();
      const result = await axios.post("http://localhost:3001/match/submission", {source_code:sourceCode, match_id:match_id});
      console.log("match-id: " + match_id);
      console.log("submission results: " + result.data + " out: " + output);
      setOutput(result.data.display_output.split("\n"));
      // when handling submission stuff, save cur users testcases passed so we can emit it to the opponent as a progress variable
      setMyCurTestcases(result.data.num_testcases_passed); 
      
      const testcases_passed = result.data.num_testcases_passed;
      console.log("testcases_passed: " + testcases_passed);
      if (socketRef.current) {
        console.log("Emitting get_opponent_update with socket:", socketRef.current.id);

        const userId = getCurrentUser();
        console.log("myCurTestcases before emitting: " + myCurTestcases + " data: " + result.data.num_testcases_passed);
        socketRef.current.emit("get_opponent_update", { match_id, userId, testcases_passed}, (response) => {  // first emit to request for update upon submission
          console.log("get_opponent_update callback:", response);
        });
      }


    } catch (error) {
      console.error(error.response.data.message);  
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
      if (userId === data.match.first_player.toString()) {
        setOpponentSubmissions(data.match.second_player_submissions);
        setOppsCurTestcasesPassed(data.match.second_player_latest_testcases_passed);
        console.log("set first in client");
      }
      if (userId === data.match.second_player.toString()) {
        setOpponentSubmissions(data.match.first_player_submissions);
        setOppsCurTestcasesPassed(data.match.first_player_latest_testcases_passed);
        console.log("set second in client");
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
    <Box w="50%">
      <h2>Opponent Submissions: {opponentSubmissions}</h2>
      <h2>Opponent Latest Testcases Passed: {oppsCurTestcasesPassed}</h2>
      <Text mb={2} fontSize="lg">
        Output
      </Text>
      <Button
        variant="outline"
        colorScheme="green"
        mb={4}
        isLoading={isLoading}
        onClick={runCode}
      >
        Run Code
      </Button>

      <Button variant="outline" colorScheme="green" mb={4} isLoading={isLoading}  onClick={handleSubmitCode}>
        Submit Code
      </Button>

      <Box
        height="75vh"
        p={2}
        color={isError ? "red.400" : ""}
        border="1px solid"
        borderRadius={4}
        borderColor={isError ? "red.500" : "#333"}
      >
        {output
          ? output.map((line, i) => <Text key={i}>{line}</Text>)  
          : 'Click "Run Code" to see the output here'}
      </Box>
    </Box>
    
  );
};


export default OutputWindow;