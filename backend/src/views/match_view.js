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
const TestcaseModel = require("../models/Testcase.js");
const MatchModel = require("../models/Match.js");
const UserModel = require("../models/User.js");
require('dotenv').config();  


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

        
        const {first_player_id, second_player_id, problem_id, match_str, userID} = req.body; // use match-str to send emits?
        const first_user = await UserModel.findById(first_player_id);
        const second_user = await UserModel.findById(second_player_id);

        console.log("firstp: " + first_player_id);
        console.log("secondp: " + second_player_id);
        const new_match = new MatchModel({
            first_player:first_player_id,
            second_player: second_player_id,
            problem:problem_id,
            started:true,
            match_str:match_str
        })


        await new_match.save();

        first_user.matches.push(new_match._id);
        second_user.matches.push(new_match._id);
        first_user.save();
        second_user.save();
        // await first_user.save();
        // await second_user.save();

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
router.get("/get-match-problem/:match_id", async (req, res) => {
    const { match_id } = req.params;

    try {
        const match = await MatchModel.findById(match_id).populate('problem'); // fill in problen attribute not just its id

        if (!match) {
        return res.status(404).json({ message: "Match not found" });
        }

        res.status(200).json({ message: "Match retrieved successfully", problem:match.problem, total_testcases:match.problem.test_cases.length });

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
Input given to compiler API will be "1 2 3\n9\n4 5 6\n7\n8", where each input is seperated by \n.
Only handles array and integer inputs problems. Pass in match-id in body. 

nums = list(map(int, input().split()))
target = int(input())

def two_sum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            return [lookup[diff], i]
        lookup[num] = i

result = two_sum(nums, target)
print(result)

example
3 2 4
6
*/
router.post("/submission", async (req, res) => {
    console.log("-----Submission Start Processing Testcases-----:");

    const {sourceCode, languageId, match_id, userID} = req.body;

    try {
        const match = await MatchModel.findById(match_id).populate({path: "problem", populate: { path: "test_cases" }, }); // this query is slowing down application for every submission, so use caching

        // some variables for the result of the submission
        let num_testcases_passed = 0;
        let total_testcases = match.problem.test_cases.length; 
        let first_failed_tc = null;
        let first_failed_tc_user_output = null;
        let submission_result = "passed";
        // iterate problem.testcases
        // get each testcase input, format it pass it in compiler api get its output and check if its equal with testcase.output, 
        // NOTE: have to iterate all testcases and then send api-request for each testcase too many requests
        for (const cur_testcase of match.problem.test_cases) {

            const formatted_input = format_input(cur_testcase.input);   // format list input if it has into [1,2,3]-> 1 2 3
            // console.log("formatted-input: \n" + formatted_input);
            console.log("Sending to Judge0:", { source_code: sourceCode, stdin: String(formatted_input), language_id: languageId, });
            const response = await axios.post(JUDGE0_API_URL, {source_code: sourceCode,stdin: String(formatted_input), language_id: languageId,}, { headers: JUDGE0_HEADERS } ); // compiler api request, pass in input of current testcases
            // console.log("API Response Submit Code: " +response.data);
            let user_output = response.data.stdout;
            user_output = user_output.replace(/\n/g, "");
            // console.log("User output: " + user_output + ", expected: " + cur_testcase.output);
            
            // check current testcase
            if (user_output === cur_testcase.output) { 
                num_testcases_passed++;
                // console.log("testcase #" + cur_testcase._id + " passed");
            } else {
                first_failed_tc = cur_testcase;
                first_failed_tc_user_output = user_output;
                submission_result = "failed";
                // console.log("testcase #" + cur_testcase._id + " failed");
            }
            console.log("--finished processing a testcase"); // if at least one of these is printed and there is a error then too many requests in 200ms error
        
        };
        let display_output = "";
        if (submission_result === "passed") {
            display_output = "PASSED! Testcases: " + num_testcases_passed +"/" +  total_testcases;
        } else {
            display_output = "FAILED! Testcases: " + num_testcases_passed +"/" +  total_testcases + "\n" + "Input: " + first_failed_tc.input + "\n" + "Output: " + first_failed_tc.output + "\n"+ "Your output: " + first_failed_tc_user_output;
        }

        // this is compute the cur users my variables without sockets whenever they hit submit it updates their my variables, without the need to wait for socket emit event when the other
        // person hits submit
        if (userID == match.first_player) {
            console.log("in submisison route, update my variables for first-player: ", userID);
            match.first_player_submissions++;
            match.first_player_latest_testcases_passed = num_testcases_passed;
            if (num_testcases_passed > match.first_player_max_testcases_passed) {
                match.first_player_max_testcases_passed = num_testcases_passed;
            }
            await match.save();

        }
        if (userID == match.second_player) {
            console.log("in submisison route, update my variables for second-player: ", userID);
            match.second_player_submissions++;
            match.second_player_latest_testcases_passed = num_testcases_passed;
            if (num_testcases_passed > match.second_player_max_testcases_passed) {
                match.second_player_max_testcases_passed = num_testcases_passed;
            }
            await match.save();
        }

        

        // if they passed all testcases then this player has won the match, so update the match variables to relfect this
        let found_winner = false;
        if (submission_result === "passed") {
            console.log("Winner found in backend submission");
            match.winner = userID;
            found_winner = true;
        }
        await match.save();

        // returning updated-match obj with opponent-updates back to client which emits to index.js with get-opponent-update-event
        res.status(201).json({
            message: submission_result, match: match, num_testcases_passed:num_testcases_passed, total_testcases:total_testcases,
            first_failed_tc:first_failed_tc,
            first_failed_tc_user_output:first_failed_tc_user_output,
            display_output:display_output,
            num_testcases_passed:num_testcases_passed,
            total_testcases:total_testcases, 
            found_winner: found_winner

        });

    } catch (error) { 
        // console.error(error);
        console.log("Error submitting code: " + error);
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





function format_input(input) {
    const parsedInput = JSON.parse(input);
    return parsedInput
      .map((item) => {
        if (Array.isArray(item)) { // if input is an array turn into 1 2 3 4
          return item.join(" ");
        }
        return item.toString();
      })
      .join("\n"); 
}

// Executes code of custom input that user put for users own testing purposes testing
const API = axios.create({
    baseURL: "https://emkc.org/api/v2/piston",
  });
  
const executeCode = async (language, sourceCode, input) => {
    const response = await API.post("/execute", {
      language: language,
      version: "3.10.0",
      files: [
        {
          content: sourceCode,
        },
      ],
      stdin: input, // Pass the custom input here
    });
    console.log("\nCOMPILED API")
    console.log("input back: ", JSON.stringify(input, null, 2));
    console.log("source_code : ", JSON.stringify(sourceCode, null, 2));
    console.log("response back: ", JSON.stringify(response.data, null, 2));
    return response.data;
};
  


module.exports = router;