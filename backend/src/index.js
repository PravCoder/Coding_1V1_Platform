const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
// import view routes, as blankRouter, each api-view has its own router that handles endpoints, just seprating these endpoints with diff view files
const userRouter = require("./views/user_view.js");
const problemRouter = require("./views/problem_view.js");
const matchRouter = require("./views/match_view.js");


const app = express()
app.use(express.json())
app.use(cors())

// include the backend user-api-routes with base-path of /
app.use("/", userRouter);
app.use("/problem", problemRouter);
app.use("/match", matchRouter);



// connection string with db-password db-name db-password
mongoose.connect("mongodb+srv://pravachanpatra:5ct6fwHnaGaUJsDA@coding1v1platformcluste.kvwqv.mongodb.net/coding1v1platform?retryWrites=true&w=majority&appName=coding1V1platformcluster0")
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.log("Error connecting to MongoDB:", err));

// frontend runs on: 3000
// backend runs on: 3001
// confirm server is running, this is the port where all requests are sent
app.listen(3001, () => {
    console.log("server is running")
})

