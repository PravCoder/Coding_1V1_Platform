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

    // match type either regular or explanation
    type: {type: String, required:false, default: "regular"},  
    
    // used to connect sockets into a room, room id
    match_str: {type: String, required:false, default: ""},

    // amount of time match took place in MM:SS, for timer counting down, not always equal to TIME_PER_MATCH in index.js, if a player solves before timeout thats the duration of the match
    duration: { type: String, default: "0:00" },

    // by way of win. "submission"=player solved it before time ran out, "timeout-equal"=both players couldnt solve it and had equal testcases passed, "timeout-testcases"=player own because we had the most testcases passed but no solution
    win_condition: {type: String, required:false, default: "regular"},  

    // store final submissions of both players to display on match outcome page
    first_player_final_code: { type: String, default: "" },
    second_player_final_code: { type: String, default: "" },
    // stores the languages that both players wrote their solution in
    first_player_lang: { type: String, default: "python" },
    second_player_lang: { type: String, default: "python" },

}, { timestamps: true })        // make sure timestamps are enbaled so we can calcualte match duration using when it was created

const MatchModel = mongoose.model("Match", MatchSchema);
module.exports = MatchModel;