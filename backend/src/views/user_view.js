// import common libraries
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// import models
const UserModel = require("../models/User.js");
const MatchModel = require("../models/Match.js");

// create application-express-obj, obj that handles requests
const app = express()
app.use(express.json())
app.use(cors())

const router = express.Router();

router.post("/register", async (req, res) => {
    console.log("inside post request view");
    const {username, password, email} = req.body;
    const user = await UserModel.findOne({ email });  // find user-obj with that email
    if (user) {
        return res.status(400).json({message:"email already exists"});
    } else {
        // create-hashed-password, create new-user-obj setting password=hashed version
        const hashed_password = await bcrypt.hash(password, 10); 
        const newUser = new UserModel({ username:username, email:email, password:hashed_password});
        await newUser.save();
        res.status(201).json({message:"user was registered"})
    }
})

router.post("/login", async (req, res) => {
    const {email, password} = req.body;
    // try to extract user-obj with that email
    const user = await UserModel.findOne({email});
    // if that user doesnt exist with submitted email then error
    if (!user) {
        return res.status(400).json({message:"email incorrect"})
    }
    // else user with that username exists, use library to check if submitted password matches user-obj.password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid == false) {
        return res.status(400).json({message: "password is incorrect"})
    }
    // sign in user
    const token = jwt.sign({id:user._id}, "secret");
    res.json({token, userID:user._id, message:"user successfully logged in"});
})

// given a user-id from client from the getCurrentUser() in frontend it gets the data asoociated with that user for display
router.post("/get-user-data/:userID", async (req, res) => {
    const {userID} = req.params;

    try {
        // find user by ID and exclude sensitive data like password
        const user = await UserModel.findById(userID).select("-password");
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.status(200).json({ 
            message: "User data retrieved successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                matches: user.matches,
            }
        });
        
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Error retrieving user data", error: error.message });
    }
    
})

router.get("/get-matches/:userID", async (req, res) => {
    const { userID } = req.params;
    
    try {
        // Find all matches where user is either first or second player
        const matches = await MatchModel.find({
            $or: [
                { first_player: userID },
                { second_player: userID }
            ]
        })
        .populate('first_player', 'username')
        .populate('second_player', 'username')
        .populate('problem', 'title')
        .sort({ createdAt: -1 }) // Most recent first
        .limit(50); // Limit to last 50 matches

        // compute win rate and number of wins/losses in route itself
        let wins = 0;
        let losses = 0;
        let ties = 0;

        matches.forEach(match => {
            if (match.winner) {
                if (match.winner.toString() === userID) {
                    wins++;
                } else {
                    losses++;
                }
            } else {
                ties++;
            }
        });

        const totalMatches = matches.length;
        const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

        res.status(200).json({ 
            success: true,
            matches: matches,
            stats: {
                totalMatches: totalMatches,
                wins: wins,
                losses: losses,
                ties: ties,
                winRate: parseFloat(winRate)
            }
        });

    } catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).json({ 
            success: false,
            message: "Error fetching player matches", 
            error: error.message 
        });
    }
});

module.exports = router;


