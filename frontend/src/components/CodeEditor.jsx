import { useRef, useState } from "react";
import { Box, HStack } from "@chakra-ui/react";
import { Editor } from "@monaco-editor/react";
import { CODE_SNIPPETS, theme } from "../constants/api";
import OutputWindow from "../components/OutputWindow";


/* 
Custom input has to be like:
1 2 3
9
*/

const CodeEditor = ({ match_id }) => {
  const editorRef = useRef();
  const [value, setValue] = useState("");
  const [language, setLanguage] = useState("python");
  const [input, setInput] = useState(""); // State for custom input

  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const onSelect = (language) => {
    setLanguage(language);
    setValue(CODE_SNIPPETS[language]);
  };

  return (
    <Box>
      <HStack spacing={4}>
        <Box w="50%">
          {/* <LanguageSelector language={language} onSelect={onSelect} /> */}
          <Editor
            options={{
              minimap: {
                enabled: false,
              },
            }}
            height="65vh"
            theme="vs-dark"
            language={language}
            defaultValue={CODE_SNIPPETS[language]}
            onMount={onMount}
            value={value}
            onChange={(value) => setValue(value)}
          />
          <Box mt={4}>
            <label> <b>Custom Input </b></label>
            <textarea
              style={{
                width: "100%",
                height: "100px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px",
                backgroundColor: "#1e1e1e",
                color: "#d4d4d4",
              }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </Box>
        </Box>
        <OutputWindow match_id={match_id} editorRef={editorRef} language={language} input={input} />
      </HStack>
    </Box>
  );
};


export default CodeEditor;
