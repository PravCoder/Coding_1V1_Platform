import { useState, useEffect } from 'react';

const MatchTimer = ({ match_id, socketRef }) => {
  const [timerState, setTimerState] = useState('waiting'); // waiting, countdown, running
  const [countdown, setCountdown] = useState(3);
  const [displayTime, setDisplayTime] = useState('00:00:00');

  useEffect(() => {
    if (!socketRef.current) return;
    
    // Join the match room when component mounts
    const userId = localStorage.getItem('userId') || '';
    socketRef.current.emit('join_match', { match_id, user_id: userId });
    
    // Also request current time
    socketRef.current.emit('get_match_time', { match_id });
    
    // Listen for countdown start
    socketRef.current.on('start_countdown', () => {
      setTimerState('countdown');
    });
    
    // Listen for countdown ticks
    socketRef.current.on('countdown_tick', ({ count }) => {
      setCountdown(count);
    });
    
    // Listen for match start
    socketRef.current.on('match_started', () => {
      setTimerState('running');
      setDisplayTime('00:00:00');
    });
    
    // Listen for timer updates
    socketRef.current.on('timer_update', ({ formattedTime }) => {
      setDisplayTime(formattedTime);
    });
    
    // Listen for timer sync (when rejoining or requesting current time)
    socketRef.current.on('timer_sync', (data) => {
      if (data.state) {
        setTimerState(data.state);
      }
      
      if (data.formattedTime) {
        setDisplayTime(data.formattedTime);
      }
    });
    
    // Listen for match time sync responses
    socketRef.current.on('match_time_sync', (data) => {
      if (data.state) {
        setTimerState(data.state);
      }
      
      if (data.formattedTime) {
        setDisplayTime(data.formattedTime);
      }
    });
    
    return () => {
      socketRef.current.off('start_countdown');
      socketRef.current.off('countdown_tick');
      socketRef.current.off('match_started');
      socketRef.current.off('timer_update');
      socketRef.current.off('timer_sync');
      socketRef.current.off('match_time_sync');
    };
  }, [match_id, socketRef]);

  // Render based on timer state
  if (timerState === 'waiting') {
    return (
      <div className="bg-[#2D2D2D] rounded-lg p-4 mb-4">
        <h2 className="text-lg font-semibold text-white mb-2">Waiting for match to start...</h2>
      </div>
    );
  }

  if (timerState === 'countdown') {
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
        {displayTime}
      </div>
    </div>
  );
};

export default MatchTimer;