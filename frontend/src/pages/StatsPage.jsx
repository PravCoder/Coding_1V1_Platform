// StatsPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import getCurrentUser from "../hooks/getCurrentUser";

import Navbar from '../components/Navbar';

const StatsPage = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [winRate, setWinRate] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  // from hooks
  const userID = getCurrentUser();

  useEffect(() => {
    fetchPlayerMatches();
  }, []);

  const fetchPlayerMatches = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/get-matches/${userID}`);
      
      const matchesData = response.data.matches;
      const stats = response.data.stats;
      
      // Process matches to add result and player info for display
      const processedMatches = matchesData.map(match => {
        const isFirstPlayer = match.first_player._id === userID;
        
        // Determine W/L/T
        let result = 'T';
        if (match.winner) {
          if (match.winner.toString() === userID) {
            result = 'W';
          } else {
            result = 'L';
          }
        }
        
        return {
          ...match,
          result: result,
          currentPlayer: isFirstPlayer ? match.first_player.username : match.second_player.username,
          opponent: isFirstPlayer ? match.second_player.username : match.first_player.username
        };
      });
      
      setMatches(processedMatches);
      
      // Use stats from backend
      setWinRate(stats.winRate);
      setTotalWins(stats.wins);
      setTotalMatches(stats.totalMatches);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-12">
        
        {/* Win Rate Widget */}
        <div className="relative mb-12 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-red-700/10 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-tl from-red-800/10 via-transparent to-red-900/20"></div>
          
          <div className="relative bg-[#2B2B2D] rounded-2xl p-12 border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between">
              
              {/* Win Rate Display */}
              <div className="flex-1">
                <h2 className="text-gray-400 text-lg font-medium mb-2">Overall Win Rate</h2>
                <div className="flex items-baseline space-x-4">
                  <span className="text-7xl font-bold text-white">{winRate}%</span>
                  <div className="text-gray-400 text-lg">
                    <div>{totalWins}W - {totalMatches - totalWins}L</div>
                    <div className="text-sm text-gray-500">{totalMatches} total matches</div>
                  </div>
                </div>
              </div>

              {/* Visual Trophy/Icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full"></div>
                <div className="relative text-8xl">
                  {winRate >= 70 ? '🏆' : winRate >= 50 ? '⭐' : '📊'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-8 h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-1000 ease-out"
                style={{ width: `${winRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Match History Header */}
        <h2 className="text-3xl font-bold text-white mb-8">Match History</h2>

        {/* Matches List */}
        <div className="space-y-4">
          {matches.length === 0 ? (
            <div className="bg-[#2B2B2D] rounded-lg p-12 text-center border border-gray-800">
              <p className="text-gray-400 text-lg">No matches found. Start playing to build your history!</p>
            </div>
          ) : (
            matches.map((match) => (
              <button
                key={match._id}
                onClick={() => navigate(`/match-outcome/${match._id}`)}
                className="relative w-full group overflow-hidden"
              >
                {/* Red gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-900/0 via-red-700/30 to-red-900/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-red-600/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                {/* Match Card Content */}
                <div className="relative bg-[#2B2B2D] rounded-lg p-6 border border-gray-800 group-hover:border-red-900/50 transition-all duration-300 shadow-lg group-hover:shadow-red-900/20">
                  <div className="flex items-center justify-between">
                    
                    {/* Left: Result Badge */}
                    <div className="flex items-center space-x-6">
                      <div className={`text-4xl font-bold px-6 py-2 rounded-lg ${
                        match.result === 'W' 
                          ? 'bg-green-900/30 text-green-400 border border-green-700/50' 
                          : 'bg-red-900/30 text-red-400 border border-red-700/50'
                      }`}>
                        {match.result}
                      </div>

                      {/* Players & Problem Info */}
                      <div className="text-left">
                        <div className="text-white font-semibold text-lg mb-1">
                          {match.currentPlayer} <span className="text-red-500">vs</span> {match.opponent}
                        </div>
                        <div className="text-gray-400 text-sm">
                          Problem: <span className="text-red-400">{match.problem?.title || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-3 mt-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            match.type === 'explanation' 
                              ? 'bg-purple-900/30 text-purple-400 border border-purple-700/50'
                              : 'bg-blue-900/30 text-blue-400 border border-blue-700/50'
                          }`}>
                            {match.type === 'explanation' ? '🎤 Explanation' : '⚡ Regular'}
                          </span>
                          <span className="text-gray-500 text-xs">{formatDate(match.createdAt)}</span>
                          {match.duration && match.duration !== '0:00' && (
                            <span className="text-gray-500 text-xs">⏱️ {match.duration}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Arrow Icon */}
                    <div className="text-gray-600 group-hover:text-red-500 transition-colors duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
