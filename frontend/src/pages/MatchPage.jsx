import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from "axios";
import { useCookies } from "react-cookie";
import  getCurrentUser  from "../hooks/getCurrentUser";
import OutputWindow from "../components/OutputWindow";
import CodeEditor from "../components/CodeEditor";
import OpponentUpdates from "../components/OpponentUpdates";
import io from "socket.io-client";
// connect to server from client-side establishes socketio connection with backend running on 3001
const socket = io.connect("http://localhost:3001"); 


const MatchPage = () => {
  
  const { match_id } = useParams();

  // useEffect(() => {
  //   socket.emit("rejoin_room", { match_id });
  // }, [socket, match_id]);

  return (
    <div>
        <OpponentUpdates match_id={match_id}/>
        <CodeEditor match_id={match_id}/>
        
    </div>
  );
  }
  
  export default MatchPage;