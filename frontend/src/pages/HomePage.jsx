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
  const [isSpeechToText, setIsSpeechToText] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const userID = getCurrentUser();
  const navigate = useNavigate();

  // called when play-button is clicked
  const handleFindMatch = () => {
    setIsSearching(true);
    // From client: emit find-match-event & broadcast data to  server listening to find-match-event
    socket.emit("find_match", { player_id: userID });
  };

  const toggleStreaming = () => {
    const newStreamingState = !isStreaming;
    setIsStreaming(newStreamingState);
    setIsSpeechToText(newStreamingState);
    if (!newStreamingState) {
      setIsVideoEnabled(false);
    }
  };

  const toggleSpeechToText = () => {
    // Only allow toggling if streaming is on
    if (isStreaming) {
      setIsSpeechToText(!isSpeechToText);
      // Add speech-to-text logic here
    }
  };

  const toggleVideo = () => {
    if (isStreaming) {
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  useEffect(() => {
    // From client: listen to match-found-event & recive the broadcasted data sent with emit from server
    socket.on("match_found", (data) => {
      //alert("Match found:  player1: ", data.opponent1 + ", player2: "+ data.opponent2 + ", " + "match_str: "+data.match_str);
      console.log("Match found:", data);
      setIsSearching(false);
      navigate(`match/${data.new_match_id}`);
    });

  }, [socket])

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
            <div className="flex flex-col space-y-2">
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
              
              {/* Video Checkbox - Only shown when streaming is on */}
              {isStreaming && (
                <div className="flex items-center space-x-2 ml-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-red-700 rounded focus:ring-red-700"
                      checked={isVideoEnabled}
                      onChange={toggleVideo}
                    />
                    <div className="flex items-center space-x-1">
                      <FaCamera className="text-white text-sm" />
                      <span className="text-white text-sm">Enable Video</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Speech-to-Text Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FaMicrophone className={`text-lg ${isStreaming ? 'text-white' : 'text-gray-500'}`} />
                <span className={`${isStreaming ? 'text-white' : 'text-gray-500'}`}>Speech to Text</span>
              </div>
              <label className={`relative inline-flex items-center ${isStreaming ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isSpeechToText}
                  onChange={toggleSpeechToText}
                  disabled={!isStreaming}
                />
                <div className={`w-11 h-6 ${isStreaming ? 'bg-gray-700' : 'bg-gray-800'} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-700`}></div>
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