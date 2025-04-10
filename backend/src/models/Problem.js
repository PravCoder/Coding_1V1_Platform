const mongoose = require("mongoose");

const ProblemSchema = new mongoose.Schema({
    title: {type:String, required:true},
    description: {type:String, required:true},
    examples: {type:String, required:false},

    // "easy","medium","hard"
    difficulty: {type:String, required:true},

    // store list of testcase-objs, displaying total_testcases this through /submission endpoint counting it and passing too client. 
    test_cases: [{type: mongoose.Schema.Types.ObjectId, ref: "Testcase" }]

})

const ProblemModel = mongoose.model("Problem", ProblemSchema);
module.exports = ProblemModel;