import React from 'react';
// deprecated: import VideoCamera from './VideoCamera'; 
import VideoChat from './VideoChat';


const MatchProgressGraph = ({
  opponentSubmissions,
  oppsCurTestcasesPassed,
  oppsMaxTestcasesPassed,
  userSubmissions,
  userCurTestcasesPassed,
  userMaxTestcasesPassed,
  totalTestcases,
  match_id,
  socketRef,
  match
}) => {
  const oppProgressPercentage = totalTestcases > 0 ? (oppsCurTestcasesPassed / totalTestcases) * 100 : 0;
  const oppMaxProgressPercentage = totalTestcases > 0 ? (oppsMaxTestcasesPassed / totalTestcases) * 100 : 0;
  const userProgressPercentage = totalTestcases > 0 ? (userCurTestcasesPassed / totalTestcases) * 100 : 0;
  const userMaxProgressPercentage = totalTestcases > 0 ? (userMaxTestcasesPassed / totalTestcases) * 100 : 0;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="text-center">
        
        <h2 className="text-xl font-bold text-white mb-2">Match Progress</h2>
        <div className="text-sm text-gray-400">Total Testcases: {totalTestcases}</div>
      </div>

      {/* Video Camera Component */}
      {/* Video Chat Component */}
      <VideoChat 
        match_id={match_id}
        match={match}
        socketRef={socketRef}
      />

      {/* Progress Bars Section */}
      {/* User Progress */}
        <div className="bg-[#2D2D2D] p-4 rounded-lg">
          Note: your opponent cannot hear you.
          <h3 className="text-lg font-semibold text-green-400 mb-3">Your Progress</h3>
          
          {/* Submissions Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">Submissions</span>
              <span className='text-green-400 font-semibold'>{userSubmissions}</span>
            </div>
          </div>

          {/* Current Testcases Passed */}
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">Current Testcases Passed</span>
              <span className="text-green-400 font-semibold">{userCurTestcasesPassed}/{totalTestcases}</span>
            </div>
            <div className="w-full bg-[#1E1E1E] rounded-full h-3">
              <div 
                className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${userProgressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Max Testcases Passed */}
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">Max Testcases Passed</span>
              <span className="text-green-400 font-semibold">{userMaxTestcasesPassed}/{totalTestcases}</span>
            </div>
            <div className="w-full bg-[#1E1E1E] rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${userMaxProgressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      <div className="space-y-2">
        {/* Opponent Progress */}
        <div className="bg-[#2D2D2D] p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-red-400 mb-3">Opponent Progress</h3>
          
          {/* Submissions Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">Submissions</span>
              <span className="text-red-400 font-semibold">{opponentSubmissions}</span>
            </div>
          
          </div>

          {/* Current Testcases Passed */}
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">Current Testcases Passed</span>
              <span className="text-red-400 font-semibold">{oppsCurTestcasesPassed}/{totalTestcases}</span>
            </div>
            <div className="w-full bg-[#1E1E1E] rounded-full h-3">
              <div 
                className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${oppProgressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Max Testcases Passed */}
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">Max Testcases Passed</span>
              <span className="text-red-400 font-semibold">{oppsMaxTestcasesPassed}/{totalTestcases}</span>
            </div>
            <div className="w-full bg-[#1E1E1E] rounded-full h-3">
              <div 
                className="bg-red-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${oppMaxProgressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        
      </div>

     
      
    </div>
  );
};

export default MatchProgressGraph;