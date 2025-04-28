// import common libraries
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const passport = require("passport")  // Add this
// import models
const UserModel = require("../models/User.js")
// create application-express-obj, obj that handles requests
const router = express.Router()

// Keep your existing routes
router.post("/register", async (req, res) => {
    console.log("inside post request view")
    const {username, password, email} = req.body
    const user = await UserModel.findOne({ email })
    if (user) {
        return res.status(400).json({message:"email already exists"})
    } else {
        const hashed_password = await bcrypt.hash(password, 10)
        const newUser = new UserModel({ username:username, email:email, password:hashed_password})
        await newUser.save()
        res.status(201).json({message:"user was registered"})
    }
})

router.post("/login", async (req, res) => {
    const {email, password} = req.body
    const user = await UserModel.findOne({email})
    if (!user) {
        return res.status(400).json({message:"email incorrect"})
    }
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (isPasswordValid == false) {
        return res.status(400).json({message: "password is incorrect"})
    }
    const token = jwt.sign({id:user._id}, "secret")
    res.json({token, userID:user._id, message:"user successfully logged in"})
})

// Add Google authentication routes
router.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
)

router.get("/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        // Generate JWT token for the authenticated user
        const token = jwt.sign({id: req.user._id}, "secret")
        
        // Redirect to frontend with token and userID as query parameters
        res.redirect(`http://localhost:3000/auth/success?token=${token}&userID=${req.user._id}`)
    }
)

// Check authentication status
router.get("/check-auth", (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ 
            isAuthenticated: true, 
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email
            }
        })
    } else {
        res.json({ isAuthenticated: false })
    }
})

module.exports = router