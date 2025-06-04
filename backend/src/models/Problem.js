const mongoose = require("mongoose");

const ProblemSchema = new mongoose.Schema({
    title: {type:String, required:true},
    description: {type:String, required:true},
    examples: {type:String, required:false},   // or just iterate a element of testcases and display it
    difficulty: {type:String, required:true},  // "easy","medium","hard"

    // name of the problem function "twoSum"
    function_name: { type: String, required: false },

    // array of input parameters of the problem
    parameters: [{
        name: { type: String, required: false },   // name of input-param displayed on screen, "nums"
        type: { type: String, required: true },    //  type of input-param, "number[]", general type name not specific to a language type
    }],

    // the type of the return object that should be returned by user
    return_type: { type: String, required: true },

    // array of testcases where each element has a input and output
    testcases: [{
        input: { type: mongoose.Schema.Types.Mixed, required: true },  // actual data structures not strings, arrays, numbers
        output: { type: mongoose.Schema.Types.Mixed, required: true },
    }]

    // for example a 

})

const ProblemModel = mongoose.model("Problem", ProblemSchema);
module.exports = ProblemModel;


/* 
Problem Example JSON:
{
  "_id": {"$oid": "68405ac2a187da32baf621f1"},
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
  "difficulty": "easy",
  "function_name": "twoSum",
  "parameters": [
    {
      "name": "nums",
      "type": "number[]",
      "description": "Array of integers"
    },
    {
      "name": "target", 
      "type": "number",
      "description": "Target sum"
    }
  ],
  "return_type": "number[]",
  "testCases": [
    {
      "input": {
        "nums": [2, 7, 11, 15],
        "target": 9
      },
      "output": [0, 1],
      "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]"
    },
    {
      "input": {
        "nums": [3, 2, 4],
        "target": 6
      },
      "output": [1, 2],
      "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]"
    },
    {
      "input": {
        "nums": [3, 3],
        "target": 6
      },
      "output": [0, 1],
      "explanation": "Because nums[0] + nums[1] == 6, we return [0, 1]"
    }
  ],
  "examples":"Example 1: Input: nums = [2,7,11,15], target = 9 Output: [0,1] Explanation: Because nums[0] + nums[1] == 9, we return [0, 1]. Example 2: Input: nums = [3,2,4], target = 6 Output: [1,2] Example 3: Input: nums = [3,3], target = 6 Output: [0,1]"
  
}

*/