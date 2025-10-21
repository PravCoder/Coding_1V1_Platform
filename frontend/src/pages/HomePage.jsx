import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import axios from "axios";
import { useCookies } from "react-cookie";
import getCurrentUser from "../hooks/getCurrentUser";
import io from "socket.io-client";
import { FaMicrophone, FaVideo, FaCamera, FaSpinner } from "react-icons/fa";
import Navbar from '../components/Navbar';

// connect to server from client-side establishes socketio connection with backend running on 3001
// in production the env var REACT_APP_API_URL is set to the backend.onrender thing
const socket = io.connect(process.env.REACT_APP_API_URL || "http://localhost:3001");

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSpeechToText, setIsSpeechToText] = useState(false); // is this a explanation match
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const userID = getCurrentUser();
  const navigate = useNavigate();

  // called when play-button is clicked
  const handleFindMatch = () => {
    setIsSearching(true);
    // From client: emit find-match-event & broadcast data to  server listening to find-match-event
    socket.emit("find_match", { player_id: userID, explanation_match:isSpeechToText, streaming:isStreaming });
  };

  // called when user presses cancel button after pressing find match, emits to event that gracefully cancels match making for this player
  const handleCancelMatchmaking = () => {
    console.log("Cancelling matchmaking...");
    socket.emit("cancel_matchmaking", { player_id: userID });
    setIsSearching(false);
  };

  // Request camera access
  const requestCameraAccess = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false // Don't request audio as per user requirement
      });
      
      // Stop the test stream immediately since we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setCameraPermissionGranted(true);
      console.log("Camera permission granted");
    } catch (error) {
      console.error("Camera permission error:", error);
      if (error.name === 'NotAllowedError') {
        setCameraError("Camera access denied. Please allow camera access in your browser settings.");
      } else if (error.name === 'NotFoundError') {
        setCameraError("No camera found. Please connect a camera.");
      } else {
        setCameraError("Could not access camera. Please check your settings.");
      }
      setCameraPermissionGranted(false);
      return false;
    }
    return true;
  };

  const toggleStreaming = async () => {
    const newStreamingState = !isStreaming;
    
    if (newStreamingState) {
      // Request camera access when enabling streaming
      const hasCameraAccess = await requestCameraAccess();
      if (!hasCameraAccess) {
        return; // Don't enable streaming if camera access fails
      }
      
      setIsStreaming(true);
      try { localStorage.setItem('streaming', 'true'); } catch {}
      // Streaming enabled → automatically enable video and explanation
      setIsVideoEnabled(true);
      setIsSpeechToText(true);
    } else {
      // Streaming disabled → automatically disable video and explanation
      setIsStreaming(false);
      try { localStorage.setItem('streaming', 'false'); } catch {}
      setIsVideoEnabled(false);
      setIsSpeechToText(false);
      setCameraPermissionGranted(false);
      setCameraError(null);
    }
  };


  const toggleSpeechToText = () => {
    setIsSpeechToText(!isSpeechToText);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    
  };

  useEffect(() => {

    // From client: listen to match-found-event & receive the broadcasted data sent with emit from server
    socket.on("match_found", (data) => {
      try {
        console.log("Match found event received:", data);
        console.log("new_match_id:", data.new_match_id);
        console.log("Type of new_match_id:", typeof data.new_match_id);
        
        if (!data.new_match_id) {
          throw new Error("new_match_id is missing from response");
        }
        
        setIsSearching(false);
        navigate(`/match/${data.new_match_id}`);
        
      } catch (error) {
        console.error("Error in match_found handler:", error);
        console.error("Received data:", data);
        setIsSearching(false); // Reset searching state even on error
      }
    }); // ← ADDED: Close the socket.on


    // listen for match making cancellation confirmation from index.js
    socket.on("matchmaking_cancelled", () => {
      console.log("Matchmaking cancelled successfully");
      setIsSearching(false);
    });

    // cancel matchmaking if component unmounts while searching
    return () => {
      if (isSearching) {
        socket.emit("cancel_matchmaking", { player_id: userID });
      }
      socket.off("match_found");
      socket.off("matchmaking_cancelled");
    };
  }, [navigate, isSearching, userID]); // ← ADDED: Close the useEffect



  return (
    <div className="flex flex-col min-h-screen bg-black">
       <Navbar />
      {/* User ID display in top right */}
      <div className="absolute top-4 right-4">
        <p className="text-white text-sm bg-gray-800 px-3 py-1 rounded-full">
          User ID: {userID}
        </p>
      </div>

      {/* Main content */}
      <div className="flex justify-center items-center flex-1">
        <div className='bg-[#2B2B2D] bg-opacity-50 shadow-lg rounded-lg p-8 w-96 flex flex-col space-y-6'>
          <h1 className="text-white text-2xl text-center font-bold">BATTLE</h1>

          {/* Toggle Switches */}
          <div className="flex flex-col space-y-4">
            {/* Streaming Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FaVideo className="text-white text-lg" />
                <span className="text-white">Streaming</span>
                {cameraPermissionGranted && (
                  <span className="text-green-400 text-xs">✓ Camera Ready</span>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isStreaming}
                  onChange={toggleStreaming}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-700"></div>
              </label>
            </div>

            {/* Camera Error Display */}
            {cameraError && (
              <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                {cameraError}
              </div>
            )}

            {/* Video Toggle */}
            {/* <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FaCamera className="text-white text-lg" />
                <span className="text-white">Enable Video</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isVideoEnabled}
                  onChange={toggleVideo}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-700"></div>
              </label>
            </div> */}

            {/* Explanation Match Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FaMicrophone className="text-white text-lg" />
                <span className="text-white">Explanation Match</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isSpeechToText}
                  onChange={toggleSpeechToText}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-700"></div>
              </label>
            </div>
          </div>

          {/* ✅ UPDATED: Play/Cancel Button with conditional rendering */}
          {!isSearching ? (
            <button 
              onClick={handleFindMatch}
              className="bg-red-700 text-white font-bold py-2 px-4 rounded-md transition flex items-center justify-center space-x-2 hover:bg-red-600"
            >
              Play! (find match)
            </button>
          ) : (
            <div className="flex flex-col space-y-3">
              {/* Loading indicator */}
              <div className="flex items-center justify-center space-x-2 text-white">
                <FaSpinner className="animate-spin text-red-500" />
                <span>Finding opponent...</span>
              </div>
              
              {/* Cancel button */}
              <button 
                onClick={handleCancelMatchmaking}
                className="bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          )}
          
        </div>
        
      </div>
      
    </div>
  );

}
  
export default HomePage;