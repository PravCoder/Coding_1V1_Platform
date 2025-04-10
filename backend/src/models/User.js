const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
    username: {type:String, required:true, unique:true},
    email: {type:String, required:true, unique:true},
    password: {type:String, required:true},

    matches: [{type: mongoose.Schema.Types.ObjectId, ref: "Match" }]
})

const UserModel = mongoose.model("users", UserSchema); // reference name "users"
module.exports = UserModel;