import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import axios from "axios";
import { useCookies } from "react-cookie";
import  getCurrentUser  from "../hooks/getCurrentUser";
import io from "socket.io-client";
// connect to server from client-side establishes socketio connection with backend running on 3001
const socket = io.connect("http://localhost:3001"); 


const HomePage = () => {
  const [user, setUser] = useState(null);
  const userID = getCurrentUser();
  const navigate = useNavigate();

  // called when play-button is clicked
  const handleFindMatch = () => {
    // From client: emit find-match-event & broadcast data to  server listening to find-match-event
    socket.emit("find_match", { player_id: userID });
  };

  
  useEffect(() => {
    // From client: listen to match-found-event & recive the broadcasted data sent with emit from server
    socket.on("match_found", (data) => {
      //alert("Match found:  player1: ", data.opponent1 + ", player2: "+ data.opponent2 + ", " + "match_str: "+data.match_str);
      console.log("Match found:", data);
      navigate(`match/${data.new_match_id}`);
    });

  }, [socket])

  return (
    <div>
      <h2>Current User id: {userID}</h2>
      <button onClick={handleFindMatch}>Play! (find match)</button>
    </div>
  );
  }
  
  export default HomePage;