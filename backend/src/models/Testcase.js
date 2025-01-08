const mongoose = require("mongoose")


const TestcaseSchema = new mongoose.Schema({
    input: {type:String, required:true},     // input = [[2,7,11,15], 9], each element is each input
    output: {type:String, required:true},    // output = [0, 1], each element is each output
});

const TestcaseModel = mongoose.model("Testcase", TestcaseSchema);
module.exports = TestcaseModel;