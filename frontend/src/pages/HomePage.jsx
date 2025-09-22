import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import axios from "axios";
import { useCookies } from "react-cookie";
import getCurrentUser from "../hooks/getCurrentUser";
import io from "socket.io-client";
import { FaMicrophone, FaVideo, FaCamera, FaSpinner } from "react-icons/fa";
// connect to server from client-side establishes socketio connection with backend running on 3001
const socket = io.connect("http://localhost:3001"); 

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSpeechToText, setIsSpeechToText] = useState(false); // is this a explanation match
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const userID = getCurrentUser();
  const navigate = useNavigate();

  // called when play-button is clicked
  const handleFindMatch = () => {
    setIsSearching(true);
    // From client: emit find-match-event & broadcast data to  server listening to find-match-event
    socket.emit("find_match", { player_id: userID, explanation_match:isSpeechToText, streaming:isStreaming });
  };

  const toggleStreaming = () => {
    const newStreamingState = !isStreaming;
    setIsStreaming(newStreamingState);
    if (newStreamingState) {
      // Streaming enabled → automatically enable video and explanation
      setIsVideoEnabled(true);
      setIsSpeechToText(true);
    } else {
      // Streaming disabled → automatically disable video and explanation
      setIsVideoEnabled(false);
      setIsSpeechToText(false);
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

    return () => {
      socket.off("match_found");
    };
  }, [navigate]); // ← ADDED: Close the useEffect



  return (
    <div className="flex flex-col min-h-screen bg-black">
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

            {/* Video Toggle */}
            <div className="flex items-center justify-between">
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
            </div>

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

          {/* Play Button with Loading State */}
          <button 
            onClick={handleFindMatch}
            disabled={isSearching}
            className={`bg-red-700 text-white font-bold py-2 px-4 rounded-md transition flex items-center justify-center space-x-2 ${
              isSearching ? 'opacity-75 cursor-not-allowed' : 'hover:bg-red-600'
            }`}
          >
            {isSearching ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Searching for match...</span>
              </>
            ) : (
              'Play! (find match)'
            )}
          </button>
        </div>
      </div>
    </div>
  );

}
  
export default HomePage;