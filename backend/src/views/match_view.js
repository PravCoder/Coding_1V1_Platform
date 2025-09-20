// import common libraries
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const cookieParser = require('cookie-parser');
// import models
const ProblemModel = require("../models/Problem.js");
// const TestcaseModel = require("../models/Testcase.js");
const MatchModel = require("../models/Match.js");
const UserModel = require("../models/User.js");
require('dotenv').config();  
// code template stuff
const typeSystem = require('../code_execution_system/data_type_system.js');
const templateGenerators = require('../code_execution_system/template_generators');
const codeWrappers = require('../code_execution_system/code_wrapper_generators.js');
const generateOutputHandling = require('../code_execution_system/output_handling.js');


// create application-express-obj, obj that handles requests
const app = express()
app.use(express.json())
app.use(cors())
app.use(cookieParser());

const router = express.Router();
const io = require('../index');  // sockets

/*
This endpoint is requested when we have two players ready selected for a match 
Creates match-obj given players & selected problem. Maybe create hook to select random problem. 
Postman: http://localhost:3001/match/create-match:
{
  "first_player_id": "677073d50e110ae33b9fda6f",
  "second_player_id": "677093c92d3662ee0e158318",
  "problem_id":"6773909915598473e6475ed5"
}


*/
router.post("/create-match", async (req, res) => {
    try {

        
        const {first_player_id, second_player_id, problem_id, match_str, userID, match_type} = req.body; // use match-str to send emits?
        const first_user = await UserModel.findById(first_player_id);
        const second_user = await UserModel.findById(second_player_id);

        console.log("CALLED CREATE MATCH");

        // console.log("firstp: " + first_player_id);
        // console.log("secondp: " + second_player_id);
        const new_match = new MatchModel({
            first_player:first_player_id,
            second_player: second_player_id,
            problem:problem_id,
            started:true,
            match_str:match_str, 
            type: match_type   // update type of match from toggle either regular or explanation
        });
        // console.log("flag2");


        await new_match.save();

        first_user.matches.push(new_match._id);
        second_user.matches.push(new_match._id);
        first_user.save();
        second_user.save();
        // await first_user.save();
        // await second_user.save();
        // console.log("flag3");

        console.log(new_match.type + " match created");
        res.status(201).json({message: "match successfully created", match: new_match});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "unable to create match", error: error.message });
    }

});

/* 
For displaying problem info have to fetch match, to access match.problem. 
Every time page is refreshed this is bottle neck. So cache match. 
*/
router.post("/get-match-problem/:match_id", async (req, res) => {  // post-request because it has body of the langaugeID
    const { match_id } = req.params;
     const { language } = req.body;   //  get from body from client

    try {
        const match = await MatchModel.findById(match_id).populate("problem"); // fill in problen attribute not just its id

        if (!match) {
        return res.status(404).json({ message: "Match not found" });
        }

        console.log("GET-MATCH-PROBLEM VIEW");
        console.log("new language: ", language);
        console.log("problem params: ", match.problem.parameters);
        // BUG: problem parameters where each param has a type & name, the type is only in one language python in the db, so the data_type_system is not recognizing it

        // get the dynamic template for this problem and return it to be displayed to user in CodeEditor.jsx component
        let template = null; 
        if (language && match.problem) {  // language is string version
            if (templateGenerators[language]) {
                template = templateGenerators[language](match.problem);     // get the template based on this problem attribuets, look at what template-generators takes in
                // console.log("template: ", template);
            }
        }

        // console.log("language: ", language);

        res.status(200).json({ message: "Match retrieved successfully", problem:match.problem, total_testcases:match.problem.testcases.length, match:match, template:template });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred", error: error.message });
    }

});




/* 
This route is for running custom input code, we have it in backend because we need access to the api key
*/
router.post("/run-code", async (req, res) => {
    console.log("\n----Running Code with Custom Input-----:")
    const { sourceCode, customInput, languageId } = req.body;
    try {
        console.log("JUDGE0_API_URL: " + JUDGE0_API_URL); // Ensure this is correct
        console.log("API-KEY: " + JUDGE0_HEADERS["X-RapidAPI-Key"]); 
        console.log("Received data:", { sourceCode, customInput, languageId });

        const response = await axios.post(JUDGE0_API_URL, {source_code: sourceCode, stdin: customInput, language_id: languageId,}, { headers: JUDGE0_HEADERS } );
        
        console.log("API Response:", response.data);
        res.status(200).json({ message: "code ran successfully", stdout:response.data.stdout, stderr:response.data.stderr, time:response.data.time,memory:response.data.memory});

    } catch (error) {
        console.log("error running code custom inp: " + error.message);
        res.status(500).json({ message: "error running code with custom input", error: error.message });
    }

});


/* 
This route processes a submission, and checks against all testcases of the matches problem, and returns the results to the component
*/
router.post("/submission", async (req, res) => {
    console.log("-----Submission Start Processing Testcases-----:");

    // sourceCode here is what the user sees in the code-editor, that they submitted
    const {sourceCode, languageId, match_id, userID} = req.body;

    try {

        const match = await MatchModel.findById(match_id).populate({path: "problem", populate: { path: "testcases" }, }); // this query is slowing down application for every submission, so use caching
        
        // 🎯 Generate Executable Code: first get the code ready to be sent to judge0-api for every testcase, cause its the same code sent for every testcase
        const language_name = getLanguageName(languageId);  // get the name of the language from its id
        // wrap the code userCode-template with input parsing, output printing, etc to its runnable
        const completeWrappedCode = codeWrappers[language_name](match.problem, sourceCode); 
        console.log("Complete Wrapped code being sent to Judge0:", completeWrappedCode);

        
        // few global variables relating to the entire submission not just a single local testcase
        let num_testcases_passed = 0;
        let submission_result = "passed";
        let output_information = {   // defined outside loop because we need it after testcase loop to set some variables
            num_testcases_passed: 0,
            total_testcases: match.problem.testcases.length,
            status: null,
            stdout: null,
            stderr: null,
            message: null,
            time: null,
            memory: null,
            compile_output: null,
            first_failed_tc_inp: null,
            first_failed_tc_output: null,
            first_failed_tc_user_output: null
        };

        // ITERATE EVERY TESTCASE OF PROBLEM: have to iterate all testcases and then send api-request for each testcase too many requests
        for (const cur_testcase of match.problem.testcases) {
            console.log("======Processing a testcase=====: ", cur_testcase.input);
            

            // make the testcase input into structured json
            let testcase_case_input_json = JSON.stringify(cur_testcase.input); 
            // send request to judge0 with given wrapped code and testcase input
            const response = await axios.post(JUDGE0_API_URL, {source_code: completeWrappedCode, stdin: testcase_case_input_json, language_id:languageId}, {headers: JUDGE0_HEADERS});
            console.log("API Response:", JSON.stringify(response.data, null, 2));

            // for every testcase set these variables for reuslt of submission tracking based on the submission-response-obj, updating output-information for every testcase
            output_information.status = response.data.status.id;
            output_information.stdout = response.data.stdout;
            output_information.stderr = response.data.stderr;
            output_information.message = response.data.message;
            output_information.time = response.data.time;
            output_information.memory = response.data.memory;
            output_information.compile_output = response.data.compile_output;


            // HANDLE RUNTIME/COMPILATION ERRORS
            if (output_information.status != 3) {   // runtime error when submitting code, 3=accepted, so no 3
                console.log("RUNTIME ERROR");
                let output_error_info = formatSubmissionJudge0Error(response.data);   // a string with all of the info when there is a error
                // console.log("output_error_info ", output_error_info);

                // get the testcase failure information
                output_information.first_failed_tc_inp = cur_testcase.input; 
                output_information.first_failed_tc_output = cur_testcase.output;
                output_information.first_failed_tc_user_output = response.data.stdout;
                submission_result = "runtime_error";  // set correct message, not passed or failed


                //  compute the cur users my variables without sockets whenever they hit submit it updates their my variables, without the need to wait for socket emit event when the other person hits submit
                if (userID == match.first_player) {  // if first player submitted and there was a runtime error still update their submissions
                    console.log("🔥 RUNTIME ERROR - Updating first-player stats:", userID);
                    match.first_player_submissions++;
                    match.first_player_latest_testcases_passed = 0;  // 0 for runtime error
                } else if (userID == match.second_player) {  // if second player submitted and there was a runtime error still update their submissions
                    console.log("🔥 RUNTIME ERROR - Updating second-player stats:", userID);
                    match.second_player_submissions++;
                    match.second_player_latest_testcases_passed = 0;  // 0 for runtime error
                }

                // JSON-strinfy the stuff ebfore sending for display
                if (output_information.first_failed_tc_inp) {
                    output_information.first_failed_tc_inp = JSON.stringify(output_information.first_failed_tc_inp);
                }
                if (output_information.first_failed_tc_output) {
                    output_information.first_failed_tc_output = JSON.stringify(output_information.first_failed_tc_output);
                }
                if (output_information.first_failed_tc_user_output && typeof output_information.first_failed_tc_user_output === 'object') {
                    output_information.first_failed_tc_user_output = JSON.stringify(output_information.first_failed_tc_user_output);
                }

                await match.save();  // single match save to for runtime error

                return res.status(201).json({
                    message: submission_result, match: match,  //  use submission_result instead of hardcoded string
                    num_testcases_passed: 0,  //   for runtime error
                    total_testcases:output_information.total_testcases,
                    display_output:output_error_info,  
                    output_information:output_information,
                    found_winner: false
                });
            }

            // TESTCASE OUTPUT COMPARISON WITH USER CODE OUTPUT  
            if (response.data.stdout) {
                const userOutput = JSON.parse(response.data.stdout.trim())  // convert output into javascript object
                const expectedOutput = cur_testcase.output;             //  temp variable get the otuptu of current testcase
                
                // Convert javascript-obj into JSON string for accuracy
                const userOutputJson = JSON.stringify(userOutput);         // convert user output into json string
                const expectedOutputJson = JSON.stringify(expectedOutput); // convert expected output into json string
                
                console.log("🧑 User output:", userOutputJson);
                console.log("🤖 Expected output:", expectedOutputJson);

                // JSON output comparisson
                if (userOutputJson === expectedOutputJson) {
                    num_testcases_passed++; 
                    console.log("✅ Test case passed");
                } else {
                    output_information.first_failed_tc_inp = cur_testcase.input;  // if testcase failed update, first testcase failed variables inside testcase loop
                    output_information.first_failed_tc_output = cur_testcase.output;
                    output_information.first_failed_tc_user_output = userOutput;  // ✅ FIX: Store parsed object, not string
                    submission_result = "failed";
                    console.log("❌ Test case failed");
                    break;  // if testcase is failed break aout of this loop and go to updating the my/opp variables
                }

            }
            
                    
        };

        // update final results of number of testcases passed - strinify the json to display on client side
        output_information.num_testcases_passed = num_testcases_passed;
        if (output_information.first_failed_tc_inp) {
            output_information.first_failed_tc_inp = JSON.stringify(output_information.first_failed_tc_inp);
        }
        if (output_information.first_failed_tc_output) {
            output_information.first_failed_tc_output = JSON.stringify(output_information.first_failed_tc_output);
        }
        if (output_information.first_failed_tc_user_output && typeof output_information.first_failed_tc_user_output === 'object') {
            output_information.first_failed_tc_user_output = JSON.stringify(output_information.first_failed_tc_user_output);
        }

        // GENERATE DISPLAY OUTPUT
        let display_output = "";
        if (submission_result === "passed") {
            display_output = `PASSED! Testcases: ${num_testcases_passed}/${output_information.total_testcases}`;
        } else if (submission_result === "failed") {
            display_output = `FAILED! Testcases: ${num_testcases_passed}/${output_information.total_testcases}\n` +
                           `Input: ${output_information.first_failed_tc_inp}\n` +  // ✅ FIX: Remove extra JSON.stringify since already stringified
                           `Expected: ${output_information.first_failed_tc_output}\n` +
                           `Your output: ${output_information.first_failed_tc_user_output}`;
        }


        //  compute the cur users my variables without sockets whenever they hit submit it updates their my variables, without the need to wait for socket emit event when the other person hits submit
        // FIX: CONSOLIDATED STATS UPDATE (SINGLE PLACE FOR SUCCESS/FAILURE - NO DUPLICATION)
        let found_winner = false;
        if (userID == match.first_player) {
            // console.log("Before: submissions=" + match.first_player_submissions + ", latest=" + match.first_player_latest_testcases_passed + ", max=" + match.first_player_max_testcases_passed);
            match.first_player_submissions++;
            match.first_player_latest_testcases_passed = num_testcases_passed;
            if (num_testcases_passed > match.first_player_max_testcases_passed) {
                match.first_player_max_testcases_passed = num_testcases_passed;
            }
            // console.log("After: submissions=" + match.first_player_submissions + ", latest=" + match.first_player_latest_testcases_passed + ", max=" + match.first_player_max_testcases_passed);
        } else if (userID == match.second_player) {  // FIX: Use else if to prevent both blocks from running
            // console.log("Before: submissions=" + match.second_player_submissions + ", latest=" + match.second_player_latest_testcases_passed + ", max=" + match.second_player_max_testcases_passed);
            match.second_player_submissions++;
            match.second_player_latest_testcases_passed = num_testcases_passed;
            if (num_testcases_passed > match.second_player_max_testcases_passed) {
                match.second_player_max_testcases_passed = num_testcases_passed;
            }
            // console.log("After: submissions=" + match.second_player_submissions + ", latest=" + match.second_player_latest_testcases_passed + ", max=" + match.second_player_max_testcases_passed);
        }
        

        // if they passed all testcases then this player has won the match, so update the match variables to relfect this
        if (submission_result === "passed" && num_testcases_passed === output_information.total_testcases) {  // ✅ FIX: Add check for all testcases passed
            console.log("🏆 Winner found in backend submission");
            match.winner = userID;
            found_winner = true;
        }
        
        // FIX: SINGLE SAVE OPERATION AT THE END (instead of multiple saves)
        await match.save();

        // returning updated-match obj with opponent-updates back to client which emits to index.js with get-opponent-update-event
        res.status(201).json({
            message: submission_result, match: match,
            num_testcases_passed:num_testcases_passed, 
            total_testcases:output_information.total_testcases,
            display_output:display_output,
            output_information:output_information,
            found_winner: found_winner
        });

    } catch (error) { 
        // console.error(error);
        console.log("Error submitting code:" + error);
        res.status(500).json({ message: "unable to process submission", error: error.message });
    }


});



// ***HELPER FUNCTIONS***

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true';
const JUDGE0_HEADERS = {
  'Content-Type': 'application/json',
  'X-RapidAPI-Key': process.env.X_RAPID_API_KEY,
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
};

function formatSubmissionJudge0Error(res) {
    const {
      status,
      message,
      stderr,
      compile_output,
      time,
      memory,
      token,
    } = res;
  
    // Pick the most useful error text that exists
    const errorText =
      stderr?.trim() ||
      compile_output?.trim() ||
      message?.trim() ||
      "Unknown error";
  
    return [
      "❌  **Submission Error**",
      `Status : ${status?.id} – ${status?.description}`,
      `Time   : ${time ?? "–"} sec`,
      `Memory : ${memory ?? "–"} KB`,
      "",
      "Details:",
      errorText,
      "",
      `(token: ${token})`,
    ].join("\n");
}


// maps from language-id-judge0 to langauge string name
const getLanguageName = (languageId) => {
    const languageMap = {
        71: 'python',
        63: 'javascript', 
        54: 'cpp',
        62: 'java'
    };
    return languageMap[languageId] || 'python';
};


  


module.exports = router;