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

// this is in-memory cache for timing data, later might need to refactor to match.state = active, running, countdown
const matches_timer_data  = {};

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
                .then(async response => {
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
                    
                    // Timer Sync Stuff Below
                    // remember we added this socket to match-str room above which is like connecting-matching two players to a match, now we do this
                    // if we dont have this match-timer in our in-memory store yet, init it
                    if (!matches_timer_data[new_match_id]) {
                      matches_timer_data[new_match_id] = {
                        state: 'waiting',
                        timerInterval: null,
                        startTime: null
                      };
                    }
                    // check if we correcly added the sockets-players into match-str-room
                    const num_player_in_room = await io.in(match.match_str).fetchSockets().then(sockets => sockets.length);

                    // if there are 2 players in the room and the match-timer-obj state is waiting, start the match
                    if (num_player_in_room === 2 && matches_timer_data[match_id].state === "waiting") {
                      // start countdown to match
                      matches_timer_data[match_id].state = "countdown";
                      // emit to all sockets in match-str room to start the countdown
                      io.to(match.match_str).emit('start_countdown');

                      // START THE COUNTDOWN
                      let count = 3;
                      // set-interval-function that is called every 1000 msc, countdownInterval()
                      const countdownInterval = setInterval(async () => {
                        io.to(match.match_str).emit('countdown_tick', { count });
                        count--;
                        
                        if (count < 0) {
                          clearInterval(countdownInterval);
                          // Start the match timer
                          const startTime = Date.now();
                          matches_timer_data[match_id].state = 'running';
                          matches_timer_data[match_id].startTime = startTime;
                          
                          // Update the match in the database
                          await MatchModel.findByIdAndUpdate(match_id, { 
                            started: true,
                            time_stop_watch: "00:00:00" 
                          });
                          
                          io.to(match.match_str).emit('match_started', { startTime });
                          
                          // Start a timer interval to update all clients
                          const timerInterval = setInterval(async () => {
                            if (!new_match_id[match_id]) {
                              clearInterval(timerInterval);
                              return;
                            }
                            const now = Date.now();
                            const elapsedSeconds = Math.floor((now - new_match_id[match_id].startTime) / 1000);
                            // Format time as HH:MM:SS
                            const hours = Math.floor(elapsedSeconds / 3600);
                            const minutes = Math.floor((elapsedSeconds % 3600) / 60);
                            const seconds = elapsedSeconds % 60;
                            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                            // Update in-memory and database every 5 seconds (to reduce DB writes)
                            if (elapsedSeconds % 5 === 0) {
                              try {
                                await MatchModel.findByIdAndUpdate(match_id, { time_stop_watch: formattedTime });
                              } catch (err) {
                                console.error("Error updating match time in database:", err);
                              }
                            }
                            // Broadcast to all clients every second
                            io.to(match.match_str).emit('timer_update', { 
                              elapsedSeconds, 
                              formattedTime 
                            });
                            
                          }, 1000);
                          
                          new_match_id[match_id].timerInterval = timerInterval;
                        }
                      }, 1000);
                      // if match is already runing
                    } else if (matches_timer_data[match_id].state === 'running') { 
                      const now = Date.now();
                      const elapsedSeconds = Math.floor((now - matches[match_id].startTime) / 1000);
                      // Format time
                      const hours = Math.floor(elapsedSeconds / 3600);
                      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
                      const seconds = elapsedSeconds % 60;
                      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                      
                      // send just to this socket
                      socket.emit('timer_sync', { 
                        state: 'running',
                        elapsedSeconds, 
                        formattedTime 
                      });
                    }
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
        }, found_winner:found_winner});
 

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

    // get latest mmatch time used when player first loads the match
    socket.on("get_match_time", async ({ match_id }) => {
      try {
        const match = await MatchModel.findById(match_id);
        if (!match) return;
        
        // If match is in memory and running, get time from there
        if (matches_timer_data[match_id] && matches_timer_data[match_id].state === 'running') {
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - matches_timer_data[match_id].startTime) / 1000);
          
          // Format time
          const hours = Math.floor(elapsedSeconds / 3600);
          const minutes = Math.floor((elapsedSeconds % 3600) / 60);
          const seconds = elapsedSeconds % 60;
          const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          
          socket.emit('match_time_sync', { 
            state: 'running',
            elapsedSeconds, 
            formattedTime 
          });
        } 
        // Otherwise get from database
        else {
          socket.emit('match_time_sync', { 
            state: match.started ? 'running' : 'waiting',
            formattedTime: match.time_stop_watch 
          });
        }
      } catch (error) {
        console.error("Error in get_match_time handler:", error);
      }
    });
    


    // To rejoin socket to match-str-room. Handle reconnection when a player refreshes or rejoins
    socket.on("rejoin_match", async (data) => {
        const match = await MatchModel.findById(data.match_id); // this query is slowing down application for every submission, so use caching
        
        socket.join(match.match_str); // add cur-socket to match-str-room

        // if active-matches doesnt have key with our match-id, add match-id with empty value
        if (!active_matches.has(match.match_id)) {
            active_matches.set(match.match_id, new Set());
        }

        // console.log(`Socket ${socket.id} rejoined room ${match.match_str}`);

      // TIMER SYNC STUFF
      // Check if match is already running in our in-memory store
      if (matches_timer_data[data.match_id] && matches_timer_data[data.match_id].state === 'running') {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - matches_timer_data[data.match_id].startTime) / 1000);
        
        // Format time
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = elapsedSeconds % 60;
        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Sync this player's timer
        socket.emit('timer_sync', { 
          state: 'running',
          elapsedSeconds, 
          formattedTime 
        });
      } 


      // If match exists in DB but not in memory (server restarted), reconstruct from DB
      else if (match.started && (!matches_timer_data[data.match_id] || matches_timer_data[data.match_id].state !== 'running')) {
        // This is a match that was already running but the server restarted
        // Try to reconstruct timing info from the stored time_stop_watch
        const timeComponents = match.time_stop_watch.split(':').map(Number);
        const hours = timeComponents[0] || 0;
        const minutes = timeComponents[1] || 0;
        const seconds = timeComponents[2] || 0;
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        // Reconstruct start time by going backwards from now
        const now = Date.now();
        const reconstructedStartTime = now - (totalSeconds * 1000);
        // Initialize the match in our in-memory store
        matches_timer_data[data.match_id] = {
          state: 'running',
          startTime: reconstructedStartTime,
          timerInterval: null
        };
        // Start a new timer interval
        const timerInterval = setInterval(async () => {
          if (!matches_timer_data[data.match_id]) {
            clearInterval(timerInterval);
            return;
          }
          const currentTime = Date.now();
          const elapsedSeconds = Math.floor((currentTime - matches_timer_data[data.match_id].startTime) / 1000);
          // Format time
          const hours = Math.floor(elapsedSeconds / 3600);
          const minutes = Math.floor((elapsedSeconds % 3600) / 60);
          const seconds = elapsedSeconds % 60;
          const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          // Update in memory and database occasionally
          if (elapsedSeconds % 5 === 0) {
            try {
              await MatchModel.findByIdAndUpdate(data.match_id, { time_stop_watch: formattedTime });
            } catch (err) {
              console.error("Error updating match time in database:", err);
            }
          }
          // Broadcast to all clients
          io.to(match.match_str).emit('timer_update', { 
            elapsedSeconds, 
            formattedTime 
          });
        }, 1000);
        
        matches_timer_data[data.match_id].timerInterval = timerInterval;
        
        // Send initial sync to this socket
        socket.emit('timer_sync', { 
          state: 'running',
          elapsedSeconds: totalSeconds, 
          formattedTime: match.time_stop_watch 
        });
      }

        const sockets = await io.in(match.match_str).fetchSockets();
        // console.log(`Sockets in room rejoin_match" ${match.match_str}: `, sockets.map(s => s.id));
    });

});


// frontend runs on: 3000
// backend runs on: 3001
// confirm server is running, this is the port where all requests are sent
server.listen(3001, () => {
    console.log("server is running")
})

// Improved Socket.IO Server Implementation

