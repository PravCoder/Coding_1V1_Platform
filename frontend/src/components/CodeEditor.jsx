import { useRef, useState, useEffect } from "react";
import { Box, HStack } from "@chakra-ui/react";
import { Editor } from "@monaco-editor/react";
import { CODE_SNIPPETS, theme } from "../constants/api";
import OutputWindow from "../components/OutputWindow";
import axios from "axios";

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

// WARNING WE MOVED EVERYTHING INTO THIS FILE IN Match_Making_frontend branch, make sure to merge
const CodeEditor = ({ match_id }) => {
  const editorRef = useRef();
  const [sourceCode, setSourceCode] = useState("nums = list(map(int, input().split()))\ntarget = int(input())\n\ndef two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            return [lookup[diff], i]\n        lookup[num] = i\n\nresult = two_sum(nums, target)\nprint(result)");
  const [customInput, setCustomInput] = useState("");
  const [language, setLanguage] = useState("python");

  const [problem, setProblem] = useState({});
  const [match, setMatch] = useState({});

  const [isLoading, setIsLoading] = useState(false);

  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const fetchMatchProblem = async (event) => {
    try {
      // this is slowing down application have to fetch problem, every time so store match in cache. 
      const response = await axios.get(`http://localhost:3001/match/get-match-problem/${match_id}`);
      setMatch(response.data.match);
      setProblem(response.data.problem);
      console.log(response.data.problem);
    } catch (error) {
      console.error(error.response.data.message);  
    }
  };

  useEffect(() => {
    fetchMatchProblem();
  }, [match_id]);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
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
        <OutputWindow match_id={match_id} match={match} editorRef={editorRef} sourceCode={sourceCode} customInput={customInput} language={language} />

      </div>
    </div>
  );
};


export default CodeEditor;
