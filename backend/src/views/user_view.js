// import common libraries
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// import models
const UserModel = require("../models/User.js");
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
    res.json({token, userID:user._id});
})

module.exports = router;
