import { useState, useEffect } from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { executeCode } from "../constants/api";
import axios from "axios";
import "../styles/Popup.css";
import io from "socket.io-client";
// connect to server from client-side establishes socketio connection with backend running on 3001
const socket = io.connect("http://localhost:3001"); 

const OpponentUpdates = ({ match_id }) => {
    const [opponentSubmissions, setOpponentSubmissions] = useState(0);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        // frontend oppoenent progress alert
        if (opponentSubmissions) {
          setShowPopup(true);
          const timer = setTimeout(() => setShowPopup(false), 1000); // Popup visible for 1 second
          return () => clearTimeout(timer); // Cleanup timer on unmount or value change
        }

        // socket.emit("get_opponent_update", (data) => {
        //     //alert("Match found:  player1: ", data.opponent1 + ", player2: "+ data.opponent2 + ", " + "match_str: "+data.match_str);
        //     console.log("get_opponent_update:", data);
        //     // navigate(`match/${data.new_match_id}`);
        // });

        // socket.on("opponent_update", (data) => {
        //   //alert("Match found:  player1: ", data.opponent1 + ", player2: "+ data.opponent2 + ", " + "match_str: "+data.match_str);
        //   console.log("opponent_update:", data);
        //   setOpponentSubmissions(data.match.first_player_submissions);
        // });
      
    }, [opponentSubmissions, socket]);

    const changeValue = () => {  // for testing
        const new_str = Math.random().toString(36).substring(7);
        setOpponentSubmissions(new_str);
      };
  
  return (
    <div>
      <div className={`popup-container ${showPopup ? "show" : ""}`}>
        <span>Opponent Submissions: {opponentSubmissions}</span>
      </div>
      {/* <button onClick={changeValue}>Change Value</button> */}
    </div>
  );
};


export default OpponentUpdates;