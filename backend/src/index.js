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
// const TestcaseModel = require("./models/Testcase.js");
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

// track which playesr are in which matches, player_id -> match_id
const player_match_tracking = new Map();

let TIME_PER_MATCH = 10 * 60;  // minutes * 60 seconds, just change the number of minutes.

// helper function to clear match timer and prevent flickers
const clearMatchTimer = (match_id) => {
    console.log(`clearing timer for match: ${match_id}`);
    if (matches_timer_data[match_id]) {
        // clear the interval if it exists
        if (matches_timer_data[match_id].timerInterval) {
            clearInterval(matches_timer_data[match_id].timerInterval);
            console.log(`⏹️ cleared timer interval for match: ${match_id}`);
        }
        // remove the match from memory
        delete matches_timer_data[match_id];
        console.log(`🗑️ removed timer data for match: ${match_id}`);
    }
};
// once a player enter a new match we should clear all the timer data with the old match, incase if they left in the middle
const cleanupPlayerOldMatches = (player_id, new_match_id) => {  
    console.log(`Cleaning up old matches for player: ${player_id}`);
    
    const old_match_id = player_match_tracking.get(player_id);
    
    if (old_match_id && old_match_id !== new_match_id) {
        console.log(`🧹 player ${player_id} was in match ${old_match_id}, cleaning up...`);
        clearMatchTimer(old_match_id, "player_left_for_new_match");
    }

    // update tracking
    player_match_tracking.set(player_id, new_match_id);
};

// listening to connection-event which is triggered when a user establishes connection with server, when they open app
// socket-obj represents specific client that is connected. Everytime you open new tab it prints new socket.id.
io.on("connection", (socket) => {
    console.log(`user connected socket: ${socket.id}`);

    // find-match-event listenings for users wanting to play, and connects 2 users wanting to player, is emitted when play button is clicked
    socket.on("find_match", async (data) => {
        console.log("find match for: " + data.player_id, " is it explanation match ", data.explanation_match);
        userID = data.player_id;
        match_type = data.explanation_match ? "explanation" : "regular"

        // clean up any  old matches for this player once they press find match. 
        cleanupPlayerOldMatches(data.player_id, null);

        // there are not enough players to create match add cur-player to queue to wait
        if (player_queue.length == 0) {  
            player_queue.push({ socket_id: socket.id, player_id: data.player_id, match_type: match_type });
        // if there are enough players to create match with cur-player pop a player from queue and create match with cur-player
        } else if (player_queue.length >= 1 &&  player_queue[0].match_type === match_type) {
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

            // OPTION 1: select random problem
            // const problem_docs = await ProblemModel.aggregate([{ $sample: { size: 1 } }]); // await for this before going to next line
            // const random_problem = problem_docs[0];

            // OPTION 2: for testing hardcode problem object you want to test
            // matrix diagonal: 68e9b0a3b6eb8cb274f7b548
            // lucky number: 68e9b5f8b6eb8cb274f7b54a
            const random_problem = await ProblemModel.findById("68e9b5f8b6eb8cb274f7b54a");

            console.log("random_problem: " + random_problem._id);

            // send post-request to create match once we have selected/connected 2 players & problem
            // pass match-str with it
            await axios.post("http://localhost:3001/match/create-match", {
                first_player_id: player1.player_id,
                second_player_id: player2.player_id,
                problem_id:random_problem,
                match_str:match_str,
                userID: userID,  // send userID with it which we got from client the first time above and to add it to user.matches
                match_type: data.explanation_match ? "explanation" : "regular"  // when creating match send in the type of match it is from the toggle
            })
                .then(async response => {
                    console.log("match created successfuly:", response.data);
                    
                    // get all sockets in match-str room and emit match-found event along with some informational data. 
                    console.log("THE NEW MATCH ID: ", response.data.match._id);
                    // emit match-found event to all sockets in match-str room
                    io.to(match_str).emit("match_found", { 
                        opponent1: player1.player_id, 
                        opponent2: player2.player_id, 
                        match_str: match_str,
                        new_match_id: response.data.match._id  // for url redirect to match play page
                    });
                    
                    // TIMER SYNC STUFF BELOW
                    const new_match_id = response.data.match._id; // ✅ Define the variable properly
                    
                    // track both players in this new match we created
                    player_match_tracking.set(player1.player_id, new_match_id);
                    player_match_tracking.set(player2.player_id, new_match_id);
                    // clear any existing timer data for this match id to prevent flickering
                    clearMatchTimer(new_match_id);

                    // if we dont have this match-timer in our in-memory store yet, init it
                    if (!matches_timer_data[new_match_id]) {
                      matches_timer_data[new_match_id] = {
                        state: 'waiting',
                        timerInterval: null,
                        startTime: null,
                        duration: TIME_PER_MATCH // 30 minutes in seconds (30 * 60)
                    };
                    
                    // check if we correctly added the sockets-players into match-str-room
                    const num_player_in_room = await io.in(match_str).fetchSockets().then(sockets => sockets.length); // ✅ Use match_str

                    // if there are 2 players in the room and the match-timer-obj state is waiting, start the match
                    if (num_player_in_room === 2 && matches_timer_data[new_match_id].state === "waiting") { // ✅ Use new_match_id
                      // start countdown to match
                      matches_timer_data[new_match_id].state = "countdown"; // ✅ Use new_match_id
                      // emit to all sockets in match-str room to start the countdown
                      io.to(match_str).emit('start_countdown'); // ✅ Use match_str

                      // START THE COUNTDOWN
                      let count = 3;
                      // set-interval-function that is called every 1000 msc, countdownInterval()
                      const countdownInterval = setInterval(async () => {
                        io.to(match_str).emit('countdown_tick', { count }); // ✅ Use match_str
                        count--;
                        
                        if (count < 0) {
                          clearInterval(countdownInterval);
                          // start the match timer fresh
                          const startTime = Date.now();
                          matches_timer_data[new_match_id].state = 'running'; // ✅ Use new_match_id
                          matches_timer_data[new_match_id].startTime = startTime; // ✅ Use new_match_id
                          
                          // Update the match in the database
                          await MatchModel.findByIdAndUpdate(new_match_id, { // ✅ Use new_match_id
                            started: true,
                            time_stop_watch: "00:00:00" 
                          });
                          
                          io.to(match_str).emit('match_started', { startTime }); // ✅ Use match_str
                          
                          // clear and existing timer before starting new one
                          if (matches_timer_data[new_match_id].timerInterval) {
                            clearInterval(matches_timer_data[new_match_id].timerInterval);
                          }
                          
                          // Start a timer interval to update all clients
                          const timerInterval = setInterval(async () => {
                            if (!matches_timer_data[new_match_id] || matches_timer_data[new_match_id].state !== 'running') {
                              clearInterval(timerInterval);
                              return;
                            }
                            const now = Date.now();
                            const elapsedSeconds = Math.floor((now - matches_timer_data[new_match_id].startTime) / 1000);
                            const remainingSeconds = Math.max(0, matches_timer_data[new_match_id].duration - elapsedSeconds);

                            // TIME EXPIRED CHECK
                            if (remainingSeconds <= 0) {
                              clearInterval(timerInterval);
                              console.log(`⏰ Timer expired for match: ${new_match_id}`);
                              const winnerResult = await determineMatchWinner(new_match_id);   // determine who won on testcases
                              if (winnerResult) {
                                const { winner, win_condition } = winnerResult;
                                // update final time for consistancy
                                await MatchModel.findByIdAndUpdate(new_match_id, { 
                                  time_stop_watch: "00:00:00"
                                });
                                
                                // emit that the match time has expired client
                                if (winner) {
                                  io.to(match_str).emit("match_completed_timeout", {
                                    winner: winner,
                                    win_condition: win_condition,
                                  });
                                } 
                                
                                console.log(`🏆 Match ${new_match_id} completed. Winner: ${winner}, Condition: ${win_condition}`);
                              }
                              
                              clearMatchTimer(new_match_id);
                              return;
                            }

                            // Update formatting to show remaining time:
                            const hours = Math.floor(remainingSeconds / 3600);
                            const minutes = Math.floor((remainingSeconds % 3600) / 60);
                            const seconds = remainingSeconds % 60;
                            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                            
                            // Update in-memory and database every 5 seconds (to reduce DB writes)
                            if (elapsedSeconds % 5 === 0) {
                              try {
                                await MatchModel.findByIdAndUpdate(new_match_id, { time_stop_watch: formattedTime });
                              } catch (err) {
                                console.error("Error updating match time in database:", err);
                              }
                            }
                            
                            // Broadcast to all clients every second
                            io.to(match_str).emit('timer_update', {
                              remainingSeconds, 
                              formattedTime 
                            });
                            
                          }, 1000);
                          
                          matches_timer_data[new_match_id].timerInterval = timerInterval; // ✅ Use new_match_id
                        }
                      }, 1000);
                      
                    // if match is already running
                    } else if (matches_timer_data[new_match_id].state === 'running') {
                        const now = Date.now();
                        const elapsedSeconds = Math.floor((now - matches_timer_data[new_match_id].startTime) / 1000);
                        const remainingSeconds = Math.max(0, matches_timer_data[new_match_id].duration - elapsedSeconds);

                        // Update formatting to show remaining time:
                        const hours = Math.floor(remainingSeconds / 3600);
                        const minutes = Math.floor((remainingSeconds % 3600) / 60);
                        const seconds = remainingSeconds % 60;
                        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        
                        // send just to this socket
                        socket.emit('timer_sync', { 
                          state: 'running',
                          remainingSeconds, 
                          formattedTime 
                        });
                      };
                    }
                })
                .catch(error => {
                    console.error("unable to create match in index.js:", error.message);
                });
        }
        console.log("updated queue: " , player_queue.length);
    });

    // On server: listening for opponent-update-event from client
    socket.on("get_opponent_update", async (data) => {
        console.log("get_opponent_update_server id: " + data.match_id);

        userId = data.userId;  // get this users id given from client
        const match = await MatchModel.findById(data.match_id).populate("problem"); // this query is slowing down application for every submission, so use caching
        
        // when other person submits, and they pass testcases we want to redirect our user
        let found_winner = false;
        if (match.first_player_max_testcases_passed == match.problem.testcases.length || match.second_player_max_testcases_passed == match.problem.testcases.length ) {
            found_winner = true;
            clearMatchTimer(data.match_id);
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
            winner:match.winner, 
            type: match.type,   // passing so we know weather to redirect upon winner found or not
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


    /* 
    Listening for whenever a player clicks done for explanation match
    */
    socket.on("player_done", async (data) => {
        const { match_id } = data;
        console.log("Player marked as done for match:", match_id);
        
        try {
            // make sure its updated state is populated
            const match = await MatchModel.findById(match_id)
              .populate('first_player', 'username')
              .populate('second_player', 'username')
              .populate('winner', 'username')
              .populate('problem', 'title');
            if (!match) return;
            
            // notify the other player
            socket.to(match.match_str).emit("opponent_done");
            
            // if both players are done, notify both to stop loading on match-outcome page
            if (match.first_player_done && match.second_player_done) {
                io.to(match.match_str).emit("both_players_done", { match });
            }
        } catch (error) {
            console.error("Error handling player_done:", error);
        }
    });

    // get latest match time used when player first loads the match
    socket.on("get_match_time", async ({ match_id }) => {
      try {
        const match = await MatchModel.findById(match_id);
        if (!match) return;
        
        // If match is in memory and running, get time from there
        if (matches_timer_data[match_id] && matches_timer_data[match_id].state === 'running') {
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - matches_timer_data[match_id].startTime) / 1000);
          const remainingSeconds = Math.max(0, matches_timer_data[match_id].duration - elapsedSeconds);
          
          // Format time
          const hours = Math.floor(remainingSeconds / 3600);
          const minutes = Math.floor((remainingSeconds % 3600) / 60);
          const seconds = remainingSeconds % 60;
          const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          
          socket.emit('match_time_sync', { 
            state: 'running',
            remainingSeconds, 
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



    // Video streaming handlers
    socket.on("video_stream_ready", async (data) => {
        console.log(`Video stream ready for match: ${data.match_id}`);
        try {
            const match = await MatchModel.findById(data.match_id);
            if (match && match.match_str) {
                console.log(`Notifying other players in room: ${match.match_str}`);
                // Notify other players in the same match that video is available
                socket.to(match.match_str).emit("video_stream_ready");
            } else {
                console.log(`Match not found or no match_str for: ${data.match_id}`);
            }
        } catch (error) {
            console.error("Error in video_stream_ready:", error);
        }
    });

    socket.on("video_offer", async (data) => {
        console.log(`Video offer received for match: ${data.match_id}`);
        try {
            const match = await MatchModel.findById(data.match_id);
            if (match && match.match_str) {
                console.log(`Forwarding offer to room: ${match.match_str}`);
                // Forward the offer to the other player in the match
                socket.to(match.match_str).emit("video_offer", data.offer);
            } else {
                console.log(`Match not found or no match_str for: ${data.match_id}`);
            }
        } catch (error) {
            console.error("Error in video_offer:", error);
        }
    });

    socket.on("video_answer", async (data) => {
        console.log(`Video answer received for match: ${data.match_id}`);
        try {
            const match = await MatchModel.findById(data.match_id);
            if (match && match.match_str) {
                console.log(`Forwarding answer to room: ${match.match_str}`);
                // Forward the answer to the other player in the match
                socket.to(match.match_str).emit("video_answer", data.answer);
            } else {
                console.log(`Match not found or no match_str for: ${data.match_id}`);
            }
        } catch (error) {
            console.error("Error in video_answer:", error);
        }
    });

    socket.on("ice_candidate", async (data) => {
        console.log(`ICE candidate received for match: ${data.match_id}`);
        try {
            const match = await MatchModel.findById(data.match_id);
            if (match && match.match_str) {
                console.log(`Forwarding ICE candidate to room: ${match.match_str}`);
                // Forward the ICE candidate to the other player in the match
                socket.to(match.match_str).emit("ice_candidate", data.candidate);
            } else {
                console.log(`Match not found or no match_str for: ${data.match_id}`);
            }
        } catch (error) {
            console.error("Error in ice_candidate:", error);
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

      // TIMER SYNC STUFF
      // Check if match is already running in our in-memory store
      if (matches_timer_data[data.match_id] && matches_timer_data[data.match_id].state === 'running') {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - matches_timer_data[data.match_id].startTime) / 1000);
        const remainingSeconds = Math.max(0, matches_timer_data[data.match_id].duration - elapsedSeconds);
        
        // Format time
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;
        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Sync this player's timer
        socket.emit('timer_sync', { 
          state: 'running',
          remainingSeconds, 
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
        // initialize the match in our in-memory store
        // Start a new timer interval
        
        matches_timer_data[data.match_id] = {
          state: 'running',
          startTime: reconstructedStartTime,
          timerInterval: null,
          duration: TIME_PER_MATCH // Add duration here too
        };

        // Start a new timer interval
        const timerInterval = setInterval(async () => {
          if (!matches_timer_data[data.match_id]) {
            clearInterval(timerInterval);
            return;
          }
          const currentTime = Date.now();
          const elapsedSeconds = Math.floor((currentTime - matches_timer_data[data.match_id].startTime) / 1000);
          const remainingSeconds = Math.max(0, matches_timer_data[data.match_id].duration - elapsedSeconds);
          
          // TIME EXPIRED CHECK
          if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            console.log(`⏰ Timer expired for match: ${match._id}`);
            const winnerResult = await determineMatchWinner(match._id);   // determine who won on testcases
            if (winnerResult) {
              const { winner, win_condition } = winnerResult;
              // update final time for consistancy
              await MatchModel.findByIdAndUpdate(match._id, { 
                time_stop_watch: "00:00:00"
              });
              
              // emit that the match time has expired to the cleint
              if (winner) {
                io.to(match.match_str).emit("match_completed_timeout", {
                  winner: winner,
                  win_condition: win_condition,
                });
              } 
              
              console.log(`🏆 Match ${match._id} completed. Winner: ${winner}, Condition: ${win_condition}`);
            }
            clearMatchTimer(match.new_match_id);
            return;
          }
          
          // Format time
          const hours = Math.floor(remainingSeconds / 3600);
          const minutes = Math.floor((remainingSeconds % 3600) / 60);
          const seconds = remainingSeconds % 60;
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
            remainingSeconds, 
            formattedTime 
          });
        }, 1000);

        // Calculate remaining seconds for initial sync
        const remainingSecondsForSync = Math.max(0, TIME_PER_MATCH - totalSeconds);
        const hoursSync = Math.floor(remainingSecondsForSync / 3600);
        const minutesSync = Math.floor((remainingSecondsForSync % 3600) / 60);
        const secondsSync = remainingSecondsForSync % 60;
        const formattedTimeSync = `${hoursSync.toString().padStart(2, '0')}:${minutesSync.toString().padStart(2, '0')}:${secondsSync.toString().padStart(2, '0')}`;

        // Send initial sync to this socket
        socket.emit('timer_sync', { 
          state: 'running',
          remainingSeconds: remainingSecondsForSync, 
          formattedTime: formattedTimeSync 
        });

      }

        const sockets = await io.in(match.match_str).fetchSockets();
    });
});



/* 
Returns player id and way of win after match timeouts 

After match timesouts and nobody solved it completely:
Solved more testcases
Tie same amount of testcases passed
*/
const determineMatchWinner = async (match_id) => {

  try {
    const match = await MatchModel.findById(match_id).populate('problem');
  
    const totalTestcases = match.problem.testcases.length;
    const player1MaxPassed = match.first_player_max_testcases_passed || 0;
    const player2MaxPassed = match.second_player_max_testcases_passed || 0;
    let win_condition = "";

    if (player1MaxPassed > player2MaxPassed) {
      winner = match.first_player;
      win_condition = "more_testcases";
    } else if (player2MaxPassed > player1MaxPassed) {
      winner = match.second_player;
      win_condition = "more_testcases";
    }

    if (player1MaxPassed === player2MaxPassed) {
      winner = match.first_player;   // need to change this
      win_condition = "tie";
    }
    
    // update match with winner and win-condition
    await MatchModel.findByIdAndUpdate(match_id, {
      winner: winner,
      win_condition: win_condition,
      status: "completed",
      ended_at: new Date()
    });

    return { winner, win_condition, match };

  } catch (error) {
    console.error('Error determining winner:', error);
    return null;

  }

}

// frontend runs on: 3000
// backend runs on: 3001
// confirm server is running, this is the port where all requests are sent
server.listen(3001, () => {
    console.log("server is running")
})