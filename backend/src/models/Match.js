const mongoose = require("mongoose")

const MatchSchema = new mongoose.Schema({
    first_player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    second_player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    winner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "users", 
    },
    problem: {   // storse problem-obj selected for this match
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Problem", 
    },


    // number of submission each player currently has
    first_player_submissions: { type:Number, required:false, min:0, default: 0},
    second_player_submissions: { type:Number, required:false, min:0, default: 0},
    // maxium number of testcases each player has passed on a submission
    first_player_max_testcases_passed: { type:Number, required:false, min:0, default: 0},
    second_player_max_testcases_passed: { type:Number, required:false, min:0, default: 0},
    // number testcases passed on latest submission for each player
    first_player_latest_testcases_passed: { type:Number, required:false, min:0, default: 0},
    second_player_latest_testcases_passed: { type:Number, required:false, min:0, default: 0},

    // has match been started
    started: {type:Boolean, default:false },
    
    // current time of match
    time_stop_watch: {type: String, required:false, default: "00:0:00"},
    
    // used to connect sockets into a room, room id
    match_str: {type: String, required:false, default: ""},
})

const MatchModel = mongoose.model("Match", MatchSchema);
module.exports = MatchModel;