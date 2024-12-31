const mongoose = require("mongoose")


const TestcaseSchema = new mongoose.Schema({
    input: {type:String, required:true},   
    output: {type:String, required:true},
});

const TestcaseModel = mongoose.model("Testcase", TestcaseSchema);
module.exports = TestcaseModel;