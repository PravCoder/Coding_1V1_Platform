const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const axios = require("axios");
// socket.io stuff
const http = require("http");
const { Server } = require("socket.io");  // getting class-server from socket.io
// import view routes, as blankRouter, each api-view has its own router that handles endpoints, just seprating these endpoints with diff view files
const userRouter = require("./views/user_view.js");
const problemRouter = require("./views/problem_view.js");
const matchRouter = require("./views/match_view.js");
// models
const ProblemModel = require("./models/Problem.js");
const TestcaseModel = require("./models/Testcase.js");
const MatchModel = require("./models/Match.js");

// create app-obj
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


// create http-server with express by passing in express-app-obj
const server = http.createServer(app)

// create new socket.io server instance pass ing http-server-obj, then configure cors settings
const io = new Server(server, {
    cors: {
        origin:"http://localhost:3000", // define where frontend is, in deployment put your domain startup.com
        methods: ["GET", "POST"],
    }
})

module.exports = io; // for sockets in other files
// stores player.ids who have pressed play & are waiting to be matched, each element is {socket.id, player.id}
// holds its contents evne after refreshing the page, global variable.
// when user refreshes page socket.id is renewed
// when server is restarted player-queue is renewed, to prevent this store it in localstorage like userId.
// FIFO: pops first element in array the first person who clicked play, adds a player to end of queue
const player_queue = []

// listening to connection-event which is triggered when a user establishes connection with server, when they open app
// socket-obj represents specific client that is connected. Everytime you open new tab it prints new socket.id.
io.on("connection", (socket) => {
    console.log(`user connected socket: ${socket.id}`);

    // find-match-event listenings for users wanting to play, and connects 2 users wanting to player, is emitted when play button is clicked
    socket.on("find_match", async (data) => {
        console.log("find match for: " + data.player_id);
        // there are not enough players to create match add cur-player to queue
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
            io.in(match.match_str).fetchSockets().then((sockets) => {
                console.log(`Sockets in room ${match.match_str}:`, sockets.map(s => s.id));
            });

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
                match_str:match_str
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
        const match = await MatchModel.findById(data.match_id); // this query is slowing down application for every submission, so use caching
        if (!match) {
            console.log("Match not found for ID:", data.match_id);
            return;
        }
        // show which sockets are in this matchs-room, after refresh they are removed from room & get new socket.id
        io.in(match.match_str).fetchSockets().then((sockets) => {
            console.log(`Sockets in room ${match.match_str}:`, sockets.map(s => s.id));
        });
        io.to(match.match_str).emit("opponent_update", {match:match});
    });

    // To rejoin socket to match-str-room. Not working
    socket.on("rejoin_match", async (data) => {
        const match = await MatchModel.findById(data.match_id); // this query is slowing down application for every submission, so use caching
        socket.join(match.match_str);
        console.log(`Socket ${socket.id} rejoined room ${match_str}`);
      });

});


// frontend runs on: 3000
// backend runs on: 3001
// confirm server is running, this is the port where all requests are sent
server.listen(3001, () => {
    console.log("server is running")
})

