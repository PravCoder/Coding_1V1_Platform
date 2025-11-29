import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api from "../api/axios";
import { useNavigate } from "react-router-dom";


import io from 'socket.io-client';
import getCurrentUser from "../hooks/getCurrentUser";

const MatchOutcomeInfo = ({ match_id }) => {
  const [match, setMatch] = useState({});
  const [player1, setPlayer1] = useState({});
  const [player2, setPlayer2] = useState({});
  const [loading, setLoading] = useState(true);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const socketRef = useRef(null);
  const navigate = useNavigate();


  const fetchMatch = async () => {
    try {
      const response = await api.post(`/match/get-match-problem/${match_id}`, {});
      const matchData = response.data.match;
      setMatch(matchData);
      setPlayer1(matchData.first_player);
      setPlayer2(matchData.second_player);
      
      const currentUserId = getCurrentUser();
      const isFirstPlayer = currentUserId === matchData.first_player._id;
      
      // Check if we're waiting for opponent
      if (matchData.type === "explanation") {
        const currentPlayerDone = isFirstPlayer 
          ? matchData.first_player_done 
          : matchData.second_player_done;
        const opponentDone = isFirstPlayer 
          ? matchData.second_player_done 
          : matchData.first_player_done;
        
        if (currentPlayerDone && !opponentDone) {
          setWaitingForOpponent(true);
          setLoading(true);
        } else if (matchData.first_player_done && matchData.second_player_done) {
          setWaitingForOpponent(false);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
      
      console.log("Fetched match:", matchData);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();
    // setup socket connection
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3001");
    }

    // make sure this socket rejoins room of this match so it receives the emitss from index.js so we can listen to the below
    socketRef.current.emit("rejoin_match", { match_id });

    // just for opponent marking as done, we emit to this event in player_done-event listening
    socketRef.current.on("opponent_done", () => {
      console.log("Opponent marked as done");
      // refresh match data
      fetchMatch();
    });

    // listen for both players done, we emit to this event by condition in the player_done.on listening
    socketRef.current.on("both_players_done", (data) => {
      console.log("Both players done!");
      setWaitingForOpponent(false);
      setLoading(false);
      // update match with populated data
      if (data.match) {
          setMatch(data.match);
          setPlayer1(data.match.first_player);
          setPlayer2(data.match.second_player);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("opponent_done");
        socketRef.current.off("both_players_done");
      }
    };
  }, [match_id]);

  if (loading && waitingForOpponent) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Waiting for opponent...</h2>
          <p className="text-gray-600">Your opponent is still explaining their solution.</p>
          <div className="mt-6 bg-blue-50 p-4 rounded">
            <p className="text-sm">✓ Your submission has been recorded</p>
            <p className="text-sm">⏳ Results will appear when both players are done</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <button onClick={() => navigate("/")} className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg shadow-md hover:bg-organge-700 hover:shadow-lg transition-all duration-200">
          Back
      </button>
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
        
        <h1 className="text-3xl font-bold mb-6 text-center">Match Results</h1>
        
        <div className="mb-8 text-center">
          <h2 className="text-2xl mb-4">
            {player1.username} vs. {player2.username}
          </h2>
          
          {match.winner ? (
            <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 mb-4">
              <p className="text-2xl font-bold text-green-800">
                🏆 Winner: {match.winner.username}!
              </p>
            </div>
          ) : (
            <p className="text-xl font-semibold">Determining winner...</p>
          )}
          
          <p className="text-lg"><b>Duration: {match.duration}</b></p>
        </div>



        

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Player 1 Stats */}
          <div className="border rounded-lg p-6 bg-gray-50">
            <h3 className="text-xl font-bold mb-4">{player1.username} Stats</h3>
            <p>Submissions: {match.first_player_submissions}</p>
            <p>Latest Testcases: {match.first_player_latest_testcases_passed}</p>
            <p>Max Testcases: {match.first_player_max_testcases_passed}</p>
            
            {match.type === "explanation" && (
              <>
                <p className="mt-2 font-semibold">Testcases Score: {match.first_player_testcases_score?.toFixed(1)}%</p>
                <p className="font-semibold">Explanation Score: {match.first_player_explanation_score?.toFixed(1)}%</p>
                <p className="font-bold text-lg">Total: {match.first_player_total_score?.toFixed(1)}%</p>
              </>
            )}
          </div>

          {/* Player 2 Stats */}
          <div className="border rounded-lg p-6 bg-gray-50">
            <h3 className="text-xl font-bold mb-4">{player2.username} Stats</h3>
            <p>Submissions: {match.second_player_submissions}</p>
            <p>Latest Testcases: {match.second_player_latest_testcases_passed}</p>
            <p>Max Testcases: {match.second_player_max_testcases_passed}</p>
            
            {match.type === "explanation" && (
              <>
                <p className="mt-2 font-semibold">Testcases Score: {match.second_player_testcases_score?.toFixed(1)}%</p>
                <p className="font-semibold">Explanation Score: {match.second_player_explanation_score?.toFixed(1)}%</p>
                <p className="font-bold text-lg">Total: {match.second_player_total_score?.toFixed(1)}%</p>
              </>
            )}
          </div>
        </div>

        {/* Explanation Transcripts - Only for explanation matches */}
        {match.type === "explanation" && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Explanation Transcripts & Ratings</h2>
            
            {/* Player 1 Transcript & Evaluation */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <h3 className="text-xl font-bold mb-3">{player1.username}'s Explanation</h3>
              
              {/* Transcript */}
              {match.first_player_explanation_transcript ? (
                <div className="bg-white p-4 rounded border mb-4">
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {match.first_player_explanation_transcript}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 italic mb-4">No explanation provided</p>
              )}

              {/* Evaluation Ratings */}
              {match.first_player_explanation_evaluation && 
              match.first_player_explanation_evaluation.total_score !== undefined && (
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <h4 className="font-bold text-lg mb-3 text-blue-900">Explanation Evaluation</h4>
                  
                  {/* Overall Score */}
                  <div className="mb-4 p-3 bg-white rounded border-l-4 border-blue-500">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Total Score</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {match.first_player_explanation_evaluation.total_score}/20
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {match.first_player_explanation_evaluation.overall_feedback}
                    </p>
                  </div>

                  {/* Detailed Scores */}
                  <div className="space-y-3">
                    {/* Correctness */}
                    <div className="p-3 bg-white rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-700">Correctness</span>
                        <span className="text-lg font-bold text-green-600">
                          {match.first_player_explanation_evaluation.correctness?.score || 0}/10
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {match.first_player_explanation_evaluation.correctness?.feedback || 'N/A'}
                      </p>
                    </div>

                    {/* Clarity */}
                    <div className="p-3 bg-white rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-700">Clarity</span>
                        <span className="text-lg font-bold text-purple-600">
                          {match.first_player_explanation_evaluation.clarity?.score || 0}/5
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {match.first_player_explanation_evaluation.clarity?.feedback || 'N/A'}
                      </p>
                    </div>

                    {/* Completeness */}
                    <div className="p-3 bg-white rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-700">Completeness</span>
                        <span className="text-lg font-bold text-orange-600">
                          {match.first_player_explanation_evaluation.completeness?.score || 0}/5
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {match.first_player_explanation_evaluation.completeness?.feedback || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Final Score Breakdown */}
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded">
                    <p className="font-semibold text-sm text-gray-700">
                      Explanation Score: {match.first_player_explanation_score?.toFixed(1)}% 
                      (worth 50% of total match score)
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Testcases Score: {match.first_player_testcases_score?.toFixed(1)}%
                    </p>
                    <p className="text-lg font-bold text-blue-900 mt-2">
                      Total Match Score: {match.first_player_total_score?.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Player 2 Transcript & Evaluation */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <h3 className="text-xl font-bold mb-3">{player2.username}'s Explanation</h3>
              
              {/* Transcript */}
              {match.second_player_explanation_transcript ? (
                <div className="bg-white p-4 rounded border mb-4">
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {match.second_player_explanation_transcript}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 italic mb-4">No explanation provided</p>
              )}

              {/* Evaluation Ratings */}
              {match.second_player_explanation_evaluation && 
              match.second_player_explanation_evaluation.total_score !== undefined && (
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <h4 className="font-bold text-lg mb-3 text-blue-900">Explanation Evaluation</h4>
                  
                  {/* Overall Score */}
                  <div className="mb-4 p-3 bg-white rounded border-l-4 border-blue-500">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Total Score</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {match.second_player_explanation_evaluation.total_score}/20
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {match.second_player_explanation_evaluation.overall_feedback}
                    </p>
                  </div>

                  {/* Detailed Scores */}
                  <div className="space-y-3">
                    {/* Correctness */}
                    <div className="p-3 bg-white rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-700">Correctness</span>
                        <span className="text-lg font-bold text-green-600">
                          {match.second_player_explanation_evaluation.correctness?.score || 0}/10
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {match.second_player_explanation_evaluation.correctness?.feedback || 'N/A'}
                      </p>
                    </div>

                    {/* Clarity */}
                    <div className="p-3 bg-white rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-700">Clarity</span>
                        <span className="text-lg font-bold text-purple-600">
                          {match.second_player_explanation_evaluation.clarity?.score || 0}/5
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {match.second_player_explanation_evaluation.clarity?.feedback || 'N/A'}
                      </p>
                    </div>

                    {/* Completeness */}
                    <div className="p-3 bg-white rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-700">Completeness</span>
                        <span className="text-lg font-bold text-orange-600">
                          {match.second_player_explanation_evaluation.completeness?.score || 0}/5
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {match.second_player_explanation_evaluation.completeness?.feedback || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Final Score Breakdown */}
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded">
                    <p className="font-semibold text-sm text-gray-700">
                      Explanation Score: {match.second_player_explanation_score?.toFixed(1)}% 
                      (worth 50% of total match score)
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Testcases Score: {match.second_player_testcases_score?.toFixed(1)}%
                    </p>
                    <p className="text-lg font-bold text-blue-900 mt-2">
                      Total Match Score: {match.second_player_total_score?.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Code Display */}
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold mb-2">{player1.username}'s Code ({match.first_player_lang}):</h3>
            <pre className="bg-gray-900 text-white p-4 rounded overflow-x-auto">
              <code>{match.first_player_final_code || "No code submitted"}</code>
            </pre>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2">{player2.username}'s Code ({match.second_player_lang}):</h3>
            <pre className="bg-gray-900 text-white p-4 rounded overflow-x-auto">
              <code>{match.second_player_final_code || "No code submitted"}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchOutcomeInfo;