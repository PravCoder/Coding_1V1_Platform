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
        type: { type: String, required: true },    //  type of input-param, "number[]", "int"
    }],

    // the type of the return object that should be returned by user
    return_type: { type: String, required: true },

    // array of testcases where each element has a input and output
    testcases: [{
        input: { type: mongoose.Schema.Types.Mixed, required: true },  // actual data structures not strings
        output: { type: mongoose.Schema.Types.Mixed, required: true },
    }]

})

const ProblemModel = mongoose.model("Problem", ProblemSchema);
module.exports = ProblemModel;