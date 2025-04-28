const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const axios = require("axios")
// Add these new imports
const session = require("express-session")
const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
// socket.io stuff
const http = require("http")
const { Server } = require("socket.io")  // getting class-server from socket.io
// import view routes, as blankRouter, each api-view has its own router that handles endpoints, just separating these endpoints with diff view files
const userRouter = require("./views/user_view.js")
const problemRouter = require("./views/problem_view.js")
const matchRouter = require("./views/match_view.js")
// models
const ProblemModel = require("./models/Problem.js")
const TestcaseModel = require("./models/Testcase.js")
const MatchModel = require("./models/Match.js")
const UserModel = require("./models/User.js")  // Make sure this is imported

// Import dotenv for environment variables
const dotenv = require("dotenv")

// Load environment variables from .env file
dotenv.config()

// create app-obj
const app = express()
app.use(express.json())
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true  // Important: allow credentials
}))

// Add session middleware (before passport)
app.use(session({
  secret: "your_session_secret", // Change this to a real secret
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}))

// Initialize passport and session
app.use(passport.initialize())
app.use(passport.session())

// Configure passport serialization (how to store user in session)
passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id)
    done(null, user)
  } catch (err) {
    done(err, null)
  }
})

// Set up Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, // Use environment variable
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Use environment variable
    callbackURL: "http://localhost:3001/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists by Google ID
      let user = await UserModel.findOne({ googleId: profile.id })
      
      if (user) {
        return done(null, user)
      }
      
      // Check if user exists with the same email
      const email = profile.emails && profile.emails[0].value
      if (email) {
        user = await UserModel.findOne({ email: email })
        
        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id
          await user.save()
          return done(null, user)
        }
      }
      
      // Create a new user
      const newUser = new UserModel({
        username: profile.displayName || "Google User",
        email: email || "no-email@example.com",
        googleId: profile.id
      })
      
      await newUser.save()
      return done(null, newUser)
    } catch (err) {
      return done(err, null)
    }
  }
))

// include the backend user-api-routes with base-path of /
app.use("/", userRouter)
app.use("/problem", problemRouter)
app.use("/match", matchRouter)

// connection string with db-password db-name db-password
mongoose.connect("mongodb+srv://pravachanpatra:5ct6fwHnaGaUJsDA@coding1v1platformcluste.kvwqv.mongodb.net/coding1v1platform?retryWrites=true&w=majority&appName=coding1V1platformcluster0")
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.log("Error connecting to MongoDB:", err))

// The rest of your code remains unchanged
// create http-server with express by passing in express-app-obj
const server = http.createServer(app)

// create new socket.io server instance passing http-server-obj, then configure cors settings
const io = new Server(server, {
    cors: {
        origin:"http://localhost:3000", // define where frontend is, in deployment put your domain startup.com
        methods: ["GET", "POST"],
    }
})
// include the backend user-api-routes with base-path of /
app.use("/", userRouter);
app.use("/problem", problemRouter);
app.use("/match", matchRouter);

// module.exports = io; // for sockets in other files

// stores player.ids who have pressed play & are waiting to be matched, each element is {socket.id, player.id}
// holds its contents evne after refreshing the page, global variable.
// when user refreshes page socket.id is renewed
// when server is restarted player-queue is renewed, to prevent this store it in localstorage like userId.
// FIFO: pops first element in array the first person who clicked play, adds a player to end of queue
const player_queue = []

// each match_id -> set of socket.ids, purpose of this? to keep track of sockets
const active_matches = new Map();

// store current user ID in server end
let userID = null;

// listening to connection-event which is triggered when a user establishes connection with server, when they open app
// socket-obj represents specific client that is connected. Everytime you open new tab it prints new socket.id.
io.on("connection", (socket) => {
    console.log(`user connected socket: ${socket.id}`);

    // find-match-event listenings for users wanting to play, and connects 2 users wanting to player, is emitted when play button is clicked
    socket.on("find_match", async (data) => {
        console.log("find match for: " + data.player_id);
        userID = data.player_id;

        // there are not enough players to create match add cur-player to queue to wait
        if (player_queue.length == 0) {  
            player_queue.push({ socket_id: socket.id, player_id: data.player_id });
        // if there are enough players to create match with cur-player pop a player from queue and create match with cur-player
        } else if (player_queue.length >= 1) {
            // organize player data
            const player1 = {socket_id: socket.id, player_id: data.player_id };  // player1 is the person that sent the emit find-match
            const player2 = player_queue.shift();                                       // player2 is the player we popped from queue, who previously psent emit find-match
            
            // unqiue string used to connect sockets to a room using this string, comprised of player-string
            const match_str = `match_${player1.player_id}_${player2.player_id}`;
            // adds current socket of cur-player to a room of match-str, a room is a grouping of sockets
            socket.join(match_str);
            
            // to() gets a socket given its id, use socket-id of player2 to get that player2-socket and add player2-socket to the room of match-str
            io.to(player2.socket_id).socketsJoin(match_str);

            // show which sockets are in match-str-room
            io.in(match_str).fetchSockets().then((sockets) => {
                console.log(`Sockets in room 4 ${match_str}:`, sockets.map(s => s.id));
            });

            console.log("player1: " + player1.player_id );
            console.log("player2: " + player2.player_id + "\n");

            // select random problem
            const problem_docs = await ProblemModel.aggregate([{ $sample: { size: 1 } }]); // await for this before going to next line
            const random_problem = problem_docs[0];
            console.log("random_problem: " + random_problem._id);

            // send post-request to create match once we have selected/connected 2 players & problem
            // pass match-str with it
            await axios.post("http://localhost:3001/match/create-match", {
                first_player_id: player1.player_id,
                second_player_id: player2.player_id,
                problem_id:random_problem,
                match_str:match_str,
                userID: userID  // send userID with it which we got from client the first time above and to add it to user.matches
            })
                .then(response => {
                    console.log("match created successfuly:", response.data);
                    // notifies players, by getting the socket using players socket.id and emits to event match-found with data of the other player
                    // io.to(player1.socket_id).emit("match_found", { opponent: player2.player_id, match_str:match_str });
                    // io.to(player2.socket_id).emit("match_found", { opponent: player1.player_id, match_str:match_str });
                    
                    // get all sockets in match-str room and emit match-found event along with some informational data. 
                    io.to(match_str).emit("match_found", { 
                        opponent1: player1.player_id, 
                        opponent2: player2.player_id, 
                        match_str: match_str,
                        new_match_id: response.data.match._id  // for url redirect to match play page
                    });
                })
                .catch(error => {
                    console.error("unable to create match", error.message);
                });

        
        }
        console.log("updated queue: " , player_queue.length);
    });

    // On server: listening for opponent-update-event from client
    socket.on("get_opponent_update", async (data) => {
        console.log("get_opponent_update_server id: " + data.match_id);

        userId = data.userId;  // get this users id given from client
        // testcases_passed = data.testcases_passed;
        // console.log("mytestcases we got correct: " + testcases_passed);
        const match = await MatchModel.findById(data.match_id).populate("problem"); // this query is slowing down application for every submission, so use caching
        
        
        // when other person submits, and they pass testcases we want to redirect our user
        let found_winner = false;
        // console.log("match problem obj: ", match.problem);
        if (match.first_player_max_testcases_passed == match.problem.test_cases.length || match.second_player_max_testcases_passed == match.problem.test_cases.length ) {
            found_winner = true;
        }

        // emit back with updated match-obj, everyone in room except sender use socket.to() else use io.to() we are sending opponents updates so dont emit to cur-person. 
        socket.to(match.match_str).emit("opponent_update", {match:{
            first_player: match.first_player,
            second_player: match.second_player,
            first_player_submissions: match.first_player_submissions,
            second_player_submissions: match.second_player_submissions,
            first_player_latest_testcases_passed: match.first_player_latest_testcases_passed,
            second_player_latest_testcases_passed: match.second_player_latest_testcases_passed,
            first_player_max_testcases_passed: match.first_player_max_testcases_passed,
            second_player_max_testcases_passed: match.second_player_max_testcases_passed,
            winner:match.winner
        }, found_winner:found_winner});//
 

    });

    socket.on("get_my_update", async (data) => {
        const match = await MatchModel.findById(data.match_id); // this query is slowing down application for every submission, so use caching

        // emits to only only sender which is cur my user 
        socket.emit("user_update", {match:{
            first_player: match.first_player,
            second_player: match.second_player,
            first_player_submissions: match.first_player_submissions,
            second_player_submissions: match.second_player_submissions,
            first_player_latest_testcases_passed: match.first_player_latest_testcases_passed,
            second_player_latest_testcases_passed: match.second_player_latest_testcases_passed,
            first_player_max_testcases_passed: match.first_player_max_testcases_passed,
            second_player_max_testcases_passed: match.second_player_max_testcases_passed
        }});
    });


    // To rejoin socket to match-str-room. Not working
    socket.on("rejoin_match", async (data) => {
        const match = await MatchModel.findById(data.match_id); // this query is slowing down application for every submission, so use caching
        
        socket.join(match.match_str); // add cur-socket to match-str-room

        // if active-matches doesnt have key with our match-id, add match-id with empty value
        if (!active_matches.has(match.match_id)) {
            active_matches.set(match.match_id, new Set());
        }

        // console.log(`Socket ${socket.id} rejoined room ${match.match_str}`);

        const sockets = await io.in(match.match_str).fetchSockets();
        // console.log(`Sockets in room rejoin_match" ${match.match_str}: `, sockets.map(s => s.id));
    });

});



// frontend runs on: 3000
// backend runs on: 3001
server.listen(3001, () => {
    console.log("server is running")
})