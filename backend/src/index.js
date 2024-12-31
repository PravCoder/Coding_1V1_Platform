const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require ("dotenv").config();
// import view routes
const userRouter = require("./views/user_view.js");

const app = express()
app.use(express.json())
app.use(cors())

// include the user-api-routes
app.use("/", userRouter);

// connection string with db-password db-name db-password
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.log("Error connecting to MongoDB:", err));

// frontend runs on: 3000
// backend runs on: 3001
// confirm server is running, this is the port where all requests are sent
app.listen(3001, () => {
    console.log("server is running")
})

