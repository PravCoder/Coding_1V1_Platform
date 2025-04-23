import { useState, useEffect } from 'react';

const MatchTimer = ({ startTime, onCountdownComplete, isMatchStarted }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [actualStartTime, setActualStartTime] = useState(() => {
    const savedTime = localStorage.getItem('match_start_time');
    return savedTime ? new Date(savedTime) : null;
  });

  // Reset timer when match starts
  useEffect(() => {
    if (isMatchStarted && actualStartTime) {
      // Clear existing timer
      setElapsedTime(0);
      setActualStartTime(null);
      localStorage.removeItem('match_start_time');
      setIsCountdownActive(true);
    }
  }, [isMatchStarted]);

  // Start countdown when match begins
  useEffect(() => {
    if (isMatchStarted && !isCountdownActive && !actualStartTime) {
      setIsCountdownActive(true);
    }
  }, [isMatchStarted, isCountdownActive, actualStartTime]);

  // Countdown effect
  useEffect(() => {
    if (!isCountdownActive) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsCountdownActive(false);
          const newStartTime = new Date();
          setActualStartTime(newStartTime);
          localStorage.setItem('match_start_time', newStartTime.toISOString());
          if (onCountdownComplete) onCountdownComplete(newStartTime);
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [isCountdownActive, onCountdownComplete]);

  // Match timer effect
  useEffect(() => {
    if (!actualStartTime) return;

    try {
      const updateTimer = () => {
        const now = new Date();
        const diff = Math.floor((now - actualStartTime) / 1000); // Convert to seconds
        setElapsedTime(diff);
      };

      // Update immediately
      updateTimer();

      // Then update every second
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    } catch (err) {
      setError("Error calculating time");
      console.error(err);
    }
  }, [actualStartTime]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isMatchStarted && !actualStartTime) {
    return null;
  }

  if (error) {
    return (
      <div className="bg-[#2D2D2D] rounded-lg p-4 mb-4">
        <h2 className="text-lg font-semibold text-white mb-2">Match Timer</h2>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (isCountdownActive) {
    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md z-50" />
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">Match Starting In</h2>
            <div className="text-8xl font-bold text-red-500 animate-pulse">
              {countdown}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-[#2D2D2D] rounded-lg p-4 mb-4">
      <h2 className="text-lg font-semibold text-white mb-2">Match Timer</h2>
      <div className="text-2xl font-bold text-green-500">
        {formatTime(elapsedTime)}
      </div>
    </div>
  );
};

export default MatchTimer; 