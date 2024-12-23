const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")

const app = express()
app.use(express.json())
app.use(cors())

// connection string with db-password db-name, password is leaked here, also manually have to put db-name here after .net/
mongoose.connect("mongodb+srv://pravachanpatra:5ct6fwHnaGaUJsDA@coding1v1platformcluste.kvwqv.mongodb.net/coding1v1platform?retryWrites=true&w=majority&appName=coding1V1platformcluster0")
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.log("Error connecting to MongoDB:", err));

// confirm server is running
app.listen(3001, () => {
    console.log("server is running")
})