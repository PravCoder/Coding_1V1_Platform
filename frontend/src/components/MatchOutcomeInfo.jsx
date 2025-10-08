import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import getCurrentUser from "../hooks/getCurrentUser";

const MatchOutcomeInfo = ({ match_id }) => {
  const [match, setMatch] = useState({});
  const [player1, setPlayer1] = useState({});
  const [player2, setPlayer2] = useState({});
  const [loading, setLoading] = useState(true);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const socketRef = useRef(null);

  const fetchMatch = async () => {
    try {
      const response = await axios.post(`http://localhost:3001/match/get-match-problem/${match_id}`, {});
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

    // list for opponent marking as done, we emit to this event in player_done-event listening
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
      setMatch(data.match);
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