// import common libraries
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// import models
const ProblemModel = require("../models/Problem.js");
const TestcaseModel = require("../models/Testcase.js");
// create application-express-obj, obj that handles requests
const app = express()
app.use(express.json())
app.use(cors())

const router = express.Router();

/* 
This route is run when create problem form is submitted
To create problem-obj we need to create test-case-objs
Postman: http://localhost:3001/problem/create-problem:
{
  "title": "Two Sum",
  "description": "Given an array of integers, return indices of the two numbers such that they add up to a specific target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
  "difficulty": "easy",
  "examples": "Example 1: Input: nums = [2,7,11,15], target = 9 Output: [0,1] Explanation: Because nums[0] + nums[1] == 9, we return [0, 1]. Example 2: Input: nums = [3,2,4], target = 6 Output: [1,2] Example 3: Input: nums = [3,3], target = 6 Output: [0,1]"
  LOOK AT NOTION FOR FULL BODY OF CREATING PROBLEM OBJECT
  }
*/
router.post("/create-problem", async (req, res) => {
    try {
        const { title, description, examples, difficulty, startingCode, inputCode} = req.body; 
        // {TBD} shone validate inputs

        // create problem-obj
        const new_problem = new ProblemModel({title:title, description:description, examples:examples, difficulty:difficulty, startingCode:startingCode, inputCode:inputCode})
        new_problem.save();

        res.status(201).json({ message: "problem successfully created", new_problem });
    
    } catch (error) {
        console.error(error);
        res.status(500).json({message:"unable to create problem", error: "Server error" });
    }
})


/* 
Problem-id is given in url
Input of testcase-obj is a list where each element is a input
Output of testcase-obj is list where ecah element is a output
Add ability to add multiple testcase for problem, for now since its hardcoded only set number of testcases created
Seperate endpoint from create problem & create test because it will prob be diff forms 
This is how input & output will look. 
const input = [[2,7,11,15], 9];
const output = [0, 1];

Postman: http://localhost:3001/problem/add-testcase/6773909915598473e6475ed5:
{
  "input": "[[2,7,11,15], 9]",  # spaces between outer elements, no spaces between inner list inputs
  "output": "[0, 1]",  # spaces here
}

"[[3,2,4], 6]"
"[1, 2]"

"[[3,3], 6]"
"[0, 1]"

*/
router.post("/add-testcase/:problemId", async (req, res) => {
    try {
        const { problemId } = req.params;  // extract problem-id from url
        const { input, output } = req.body; // extract input & output submitted in create-test-case-form
        // get the current problem from url
        const problem = await ProblemModel.findById(problemId);
        // create testcase-obj when create-testcase-form is submitted on cur-problem page
        const new_testcase = new TestcaseModel({input:input, output:output});
        await new_testcase.save()
            .then(() => {
                console.log("***Testcase saved successfully!");
            })
            .catch((error) => {
                console.error("Error saving testcase:", error);
            });
        
        // add id of newly created testcase-obj to cur-problems-list of testcases
        problem.test_cases.push(new_testcase._id);
        await problem.save();
        res.status(201).json({message: "testcase added successfully", new_testcase});
    
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "unable to add testcase" });
    }
        
})

module.exports = router;
