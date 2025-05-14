const mongoose = require("mongoose")


const TestcaseSchema = new mongoose.Schema({
    // it is a string representing the entire input for this testcase. 
    // an problem can have multiple inputs so in this string each input is on a seperate line via \n
    input: {type:String, required:true},     // "2 7 6 9\n10\ntrue", this problem has 3 inputs a array, integer, and boolean

    // output="0 1", is some string representing the entire output for this testcase.
    // if a problem has multiple lines of output each line of output is on a seperate line via \n.
    output: {type:String, required:true},    
});

const TestcaseModel = mongoose.model("Testcase", TestcaseSchema);
module.exports = TestcaseModel;