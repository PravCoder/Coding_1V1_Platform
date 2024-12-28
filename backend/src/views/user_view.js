// import common libraries
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcrypt");
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

module.exports = router;
