import { useState } from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { executeCode } from "../constants/api";
import axios from "axios";


const OutputWindow = ({ match_id, editorRef, language, input }) => {
  // const toast = useToast();
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

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
      // toast({
      //   title: "An error occurred.",
      //   description: error.message || "Unable to run code",
      //   status: "error",
      //   duration: 6000,
      // });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCode = async (event) => {
    event.preventDefault();
    try {
      const sourceCode = editorRef.current.getValue();
      console.log("match-id: " + match_id);
      const result = await axios.post("http://localhost:3001/match/submission", {source_code:sourceCode, match_id:match_id});
    } catch (error) {
      console.error(error.response.data.message);  
    }
  };

  return (
    <Box w="50%">
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