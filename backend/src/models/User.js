const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
    username: {type:String, required:true, unique:false},  // not unique
    email: {type:String, required:true, unique:true},    // unique
    password: {type:String, required:false},// TODO: False if using OAuth 
    googleId: {type: String, unique: true, sparse: true}, // Add Google ID field
    matches: [{type: mongoose.Schema.Types.ObjectId, ref: "Match" }]
})

const UserModel = mongoose.model("users", UserSchema); // reference name "users"
module.exports = UserModel;