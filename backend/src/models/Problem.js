const mongoose = require("mongoose");

const ProblemSchema = new mongoose.Schema({
    title: {type:String, required:true},
    description: {type:String, required:true},
    examples: {type:String, required:false},

    // "easy","medium","hard"
    difficulty: {type:String, required:true},

    // store list of testcase-objs, displaying total_testcases this through /submission endpoint counting it and passing too client. 
    test_cases: [{type: mongoose.Schema.Types.ObjectId, ref: "Testcase" }],

    // pre-loaded template code for each problem that the user sees and edits. 
    startingCode: {
        63: String,      // javascript
        71: String,     // python
        54: String,    // c++
        62: String    // java
    },

    // this is the a string that gets added to the pre-loaded code template (for submission) that is the getting the input of the problem
    // so the user doesn't have to write code to extract the input like leetcode, they are just given the input objects and write their solution.
    // each language has its own inputCode for getting input.
    inputCode: {
        63: String,      // javascript
        71: String,     // python
        54: String,    // c++
        62: String    // java
    },
})

const ProblemModel = mongoose.model("Problem", ProblemSchema);
module.exports = ProblemModel;