// import common libraries
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
// import models
const ProblemModel = require("../models/Problem.js");
const TestcaseModel = require("../models/Testcase.js");
const MatchModel = require("../models/Match.js");
// create application-express-obj, obj that handles requests
const app = express()
app.use(express.json())
app.use(cors())

const router = express.Router();

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
        const {first_player_id, second_player_id, problem_id, match_str} = req.body; // use match-str to send emits?

        const new_match = new MatchModel({
            first_player:first_player_id,
            second_player: second_player_id,
            problem:problem_id,
            started:true
        })

        await new_match.save();

        res.status(201).json({message: "match successfully created", match: new_match});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "unable to create match", error: error.message });
    }

});

/* 
Input given to compiler API will be "1 2 3\n9\n4 5 6\n7\n8", where each input is seperated by \n.

*/
router.post("/submission", async (req, res) => {
    const API = axios.create({
        baseURL: "https://emkc.org/api/v2/piston",
    });

    const {source_code, match_id} = req.body;

 

    // get match obj
    console.log("match-id: " + match_id);
    const match = await MatchModel.findById(match_id).populate({path: "problem", populate: { path: "test_cases" }, }); // this query is slowing down application for every submission, so use caching

    // iterate problem.testcases
    // get each testcase input, format it pass it in compiler api get its output and check if its equal with testcase.output
    for (const cur_testcase of match.problem.test_cases) {

        const formtted_input = format_input(cur_testcase.input);
        const { run: result } = await executeCode("python", source_code, formtted_input); // await
        let user_output = result.output;
        user_output = user_output.replace(/\n/g, "");
        console.log("User output: " + user_output + ", expected: " + cur_testcase.output);

        if (user_output === cur_testcase.output) { 
            console.log("testcase #" + cur_testcase._id + " passed");
        } else {
            console.log("testcase #" + cur_testcase._id + " failed");
        }
    
    };



});

// helper functions
function format_input(input) {
    const parsedInput = JSON.parse(input);
    return parsedInput
      .map((item) => {
        if (Array.isArray(item)) {
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
