import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import getCurrentUser from "../hooks/getCurrentUser";
import api from "../api/axios";

const socket = io.connect(process.env.REACT_APP_API_URL || "http://localhost:3001");



const MatchWaitingPage = () => {        // aka join match page

    const { invite_token } = useParams();
    console.log("Join match page invite_token from url-param: ", invite_token);

    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // the number of players that clicked the link and are on the join match page
    const [numPlayersinRoom, setNumPlayersinRoom] = useState(0);
    const [countdown, setCountdown] = useState(null);
    const [hasJoined, setHasJoined] = useState(false);
    const userID = getCurrentUser();


    useEffect(() => {
        fetchMatchDetails();
        setupSocketListeners();

        return () => {
            // cleanup when component unmounts
            const invite_token = window.location.pathname.split('/').pop();
            socket.emit("leave_invite_lobby", { invite_token });    // when user leaves page component unmounts to send emit of leave-invite-lobby
            socket.off("lobby_status");                             // socket.off removes all listners that were previosuly attached to x event for that specific socket instance.
            socket.off("match_countdown");
            socket.off("redirect_to_match");
            socket.off("invite_error");
        };
    }, []);

    const fetchMatchDetails = async () => {
        try {
            // send request get match details assiociated with given invite-token
            const response = await api.get(`/match/get-match-invite/${invite_token}`);
            const matchData = response.data.match;
            setMatch(matchData);
            setLoading(false);

            // emit socket event to join lobby
            // userId = getCurrentUser();
            // only if its the first player emit join-invite-lobby
            if (matchData.first_player._id === userID) {
                console.log("first player - joining lobby");
                socket.emit("join_invite_lobby", { invite_token, userID });
            } else {
                console.log("second player - waiting to click Join button");
            }

        } catch (err) {
            console.log("err: ", err);
            setError(err.response?.data?.message || "Invalid invite link");
            setLoading(false);
        }
    };

    const setupSocketListeners = () => {
        // when we get a lobby-status event update the number of players present
        socket.on("lobby_status", (data) => {
            console.log("Lobby status update:", data);
            setNumPlayersinRoom(data.num_players_in_room);
        });
        // when get a match-countdown event update the current countdown number
        socket.on("match_countdown", (data) => {
            console.log("Countdown:", data.count);
            setCountdown(data.count);
        });

        // when we get a redirect-to-match event
        socket.on("redirect_to_match", (data) => {
            console.log("Redirecting to match:", data.matchID);
            navigate(`/match/${data.matchID}`);
        });

        // when we get a invite-error event
        socket.on("invite_error", (data) => {
            setError(data.message);     // set the message to display
        });
    }

    const handleJoinMatch = async () => {
        try {
            // userID = getCurrentUser();
            const response = await api.post(`/match/join-second-player/${invite_token}`, {
                userID: userID
            });

            console.log("joined match: ", response.data);
            setHasJoined(true);

            // re-remit join lobby event to trigger countdown because second player has joined
            socket.emit("join_invite_lobby", {invite_token, userID});

        } catch (err) {
            setError(err.response?.data?.message || "Failed to join match");
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
            {loading ? (
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
                    <p className="text-white text-lg">Loading match details...</p>
                </div>
            ) : error ? (
                <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
                    <div className="text-center">
                        <div className="text-6xl mb-4">❌</div>
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                        <p className="text-gray-700 mb-6">{error}</p>
                        <button 
                            onClick={() => navigate('/')}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-2xl p-8 max-w-lg w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-gray-800 mb-2">
                            🎮 Match Invitation
                        </h1>
                        <p className="text-gray-600">Get ready for an epic coding battle!</p>
                    </div>

                    {/* Match Details */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6 border border-purple-200">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-semibold">Problem:</span>
                                <span className="text-gray-900 font-bold">{match?.problem?.title}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-semibold">Difficulty:</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    match?.problem?.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                    match?.problem?.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    {match?.problem?.difficulty}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-semibold">Type:</span>
                                <span className="text-gray-900 capitalize">{match?.type}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-semibold">Host:</span>
                                <span className="text-purple-600 font-bold">{match?.firstPlayer?.username}</span>
                            </div>
                        </div>
                    </div>

                    {/* Countdown Display */}
                    {countdown !== null ? (
                        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-8 text-center border-2 border-yellow-300 animate-pulse">
                            <p className="text-gray-700 font-semibold mb-4">Match starting in</p>
                            <div className="text-8xl font-bold text-red-500 mb-2 animate-bounce">
                                {countdown}
                            </div>
                            <p className="text-gray-600 font-medium">Get ready!</p>
                        </div>
                    ) : numPlayersinRoom === 2 ? (
                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-8 text-center border-2 border-green-300">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-600 mb-4"></div>
                            <p className="text-gray-800 font-semibold text-lg">Both players ready!</p>
                            <p className="text-gray-600 mt-2">Starting match...</p>
                        </div>
                    ) : numPlayersinRoom === 1 ? (
                        <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg p-8 text-center border-2 border-blue-300">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                            <p className="text-gray-800 font-semibold text-lg mb-2">
                                Waiting for opponent...
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <div className="flex gap-1">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                                </div>
                                <span className="text-gray-600 font-medium">Players: {numPlayersinRoom}/2</span>
                            </div>
                            <p className="text-gray-500 text-sm mt-4">
                                Share the invite link with your friend!
                            </p>
                        </div>
                    ) : (
                        !hasJoined && (
                            <div className="text-center">
                                <button 
                                    onClick={handleJoinMatch}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition duration-200 transform hover:scale-105 shadow-lg"
                                >
                                    Join Match 
                                </button>
                                <p className="text-gray-500 text-sm mt-4">
                                    Click to enter the match lobby
                                </p>
                            </div>
                        )
                    )}

                    {/* Footer Info */}
                    {numPlayersinRoom > 0 && countdown === null && (
                        <div className="mt-6 text-center">
                            <p className="text-gray-500 text-sm">
                                💡 Match will start automatically when both players are ready
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
  }
  
  export default MatchWaitingPage;