import { useState, useEffect, useRef } from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { executeCode } from "../constants/api";
import axios from "axios";
import io from "socket.io-client";
// connect to server from client-side establishes socketio connection with backend running on 3001
const socket = io.connect("http://localhost:3001"); 


const OutputWindow = ({ match_id, editorRef, language, input }) => {
  // const toast = useToast();
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [opponentSubmissions, setOpponentSubmissions] = useState(0);
  const socketRef = useRef(null); // Use ref to maintain socket instance

  const runCode = async () => {
    const sourceCode = editorRef.current.getValue();
    if (!sourceCode) return;
    try {
      setIsLoading(true);
      // set output
      const { run: result } = await executeCode(language, sourceCode, input); // Pass custom input
      setOutput(result.output.split("\n")); // split by new line
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

      if (socketRef.current) {
        console.log("Emitting get_opponent_update with socket:", socketRef.current.id);
        socketRef.current.emit("get_opponent_update", { match_id }, (response) => {  // first emit to request for update
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
      
      console.log("Creating new socket connection client:", socketRef.current.id);
    }
    socketRef.current.emit("rejoin_match", { match_id }); // if their socket cahnges rejoin-match

    const handleOpponentUpdate = (data) => {
      console.log("Received opponent_update. Socket ID:", socketRef.current.id);
      console.log("Update data:", data);
      setOpponentSubmissions(data.match.first_player_submissions);
    };

    socketRef.current.on("opponent_update", handleOpponentUpdate);

    // Cleanup function
    return () => {
      socketRef.current.off("opponent_update", handleOpponentUpdate);
    };
  
  }, [match_id])

  return (
    <Box w="50%">
      <h2>Opponent Submissions: {opponentSubmissions}</h2>
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