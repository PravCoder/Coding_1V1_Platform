const mongoose = require("mongoose");

const ProblemSchema = new mongoose.Schema({
    title: {type:String, required:true},
    description: {type:String, required:true},

    // "Easy","Medium","Hard"
    difficulty: {type:String, required:true},

    // store list of testcase-objs
    test_cases: [{type: mongoose.Schema.Types.ObjectId, ref: "Testcase" }]

})

const ProblemModel = mongoose.model("Problem", ProblemSchema);
module.exports = ProblemModel;