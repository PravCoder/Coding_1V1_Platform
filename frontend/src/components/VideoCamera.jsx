import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const VideoCamera = ({ match_id, socketRef, shouldInitializeCamera = false }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [initError, setInitError] = useState(null);

  // WebRTC configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Debug logging function
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
  };

  // Initialize local camera stream
  const initializeLocalStream = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setInitError('Camera API not supported in this browser');
        setConnectionStatus('error');
        return;
      }
      addDebugLog('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setConnectionStatus('local_ready');
      addDebugLog('Camera access granted, stream ready');
      setInitError(null);
      
      // Notify socket that local stream is ready
      if (socketRef.current) {
        addDebugLog(`Notifying socket: video_stream_ready for match ${match_id}`);
        socketRef.current.emit('video_stream_ready', { match_id });
      } else {
        addDebugLog('ERROR: Socket not available');
      }
    } catch (error) {
      addDebugLog(`ERROR: Camera access failed - ${error.message}`);
      setInitError(error?.message || 'Failed to access camera');
      setConnectionStatus('error');
    }
  };

  // Create peer connection
  const createPeerConnection = () => {
    addDebugLog('Creating peer connection...');
    const peerConnection = new RTCPeerConnection(rtcConfiguration);
    
    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        addDebugLog(`Adding ${track.kind} track to peer connection`);
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      addDebugLog('Received remote track from opponent');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnectionStatus('connected');
        addDebugLog('Remote video stream connected!');
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        addDebugLog('Sending ICE candidate to opponent');
        socketRef.current.emit('ice_candidate', {
          match_id,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      addDebugLog(`Connection state: ${peerConnection.connectionState}`);
      setConnectionStatus(peerConnection.connectionState);
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      addDebugLog(`ICE connection state: ${peerConnection.iceConnectionState}`);
    };

    // Handle ICE gathering state changes
    peerConnection.onicegatheringstatechange = () => {
      addDebugLog(`ICE gathering state: ${peerConnection.iceGatheringState}`);
    };

    peerConnectionRef.current = peerConnection;
  };

  // Handle incoming offer
  const handleOffer = async (offer) => {
    try {
      addDebugLog('Received offer from opponent');
      if (!peerConnectionRef.current) {
        createPeerConnection();
      }

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      if (socketRef.current) {
        addDebugLog('Sending answer to opponent');
        socketRef.current.emit('video_answer', {
          match_id,
          answer
        });
      }
    } catch (error) {
      addDebugLog(`ERROR handling offer: ${error.message}`);
    }
  };

  // Handle incoming answer
  const handleAnswer = async (answer) => {
    try {
      addDebugLog('Received answer from opponent');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        addDebugLog('Answer processed successfully');
      }
    } catch (error) {
      addDebugLog(`ERROR handling answer: ${error.message}`);
    }
  };

  // Handle incoming ICE candidate
  const handleIceCandidate = async (candidate) => {
    try {
      addDebugLog('Received ICE candidate from opponent');
      if (peerConnectionRef.current && candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        addDebugLog('ICE candidate added successfully');
      }
    } catch (error) {
      addDebugLog(`ERROR handling ICE candidate: ${error.message}`);
    }
  };

  // Create and send offer
  const createOffer = async () => {
    try {
      addDebugLog('Creating offer...');
      if (!peerConnectionRef.current) {
        createPeerConnection();
      }

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      if (socketRef.current) {
        addDebugLog('Sending offer to opponent');
        socketRef.current.emit('video_offer', {
          match_id,
          offer
        });
      }
    } catch (error) {
      addDebugLog(`ERROR creating offer: ${error.message}`);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Auto-initialize camera when shouldInitializeCamera is true
  useEffect(() => {
    if (shouldInitializeCamera && connectionStatus === 'disconnected') {
      initializeLocalStream();
    }
  }, [shouldInitializeCamera]);

  // Setup socket listeners
  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    const handleVideoOffer = async (offer) => {
      addDebugLog('Socket received video offer');
      await handleOffer(offer);
    };

    const handleVideoAnswer = async (answer) => {
      addDebugLog('Socket received video answer');
      await handleAnswer(answer);
    };

    const handleIceCandidateMsg = async (candidate) => {
      addDebugLog('Socket received ICE candidate');
      await handleIceCandidate(candidate);
    };

    const handleVideoStreamReady = () => {
      addDebugLog('Socket received video_stream_ready event');
      // Another user joined, create offer if we're the first
      if (localStreamRef.current && !peerConnectionRef.current) {
        addDebugLog('Opponent joined, creating offer...');
        createOffer();
      }
    };

    socket.on('video_offer', handleVideoOffer);
    socket.on('video_answer', handleVideoAnswer);
    socket.on('ice_candidate', handleIceCandidateMsg);
    socket.on('video_stream_ready', handleVideoStreamReady);

    return () => {
      socket.off('video_offer', handleVideoOffer);
      socket.off('video_answer', handleVideoAnswer);
      socket.off('ice_candidate', handleIceCandidateMsg);
      socket.off('video_stream_ready', handleVideoStreamReady);
    };
  }, [match_id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'local_ready': return 'text-blue-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-[#2D2D2D] p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Video Call</h3>
        <div className="flex items-center gap-2">
          <div className={`text-sm ${getStatusColor()}`}>
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </div>
          <div className="text-xs text-gray-400">
            Match: {match_id}
          </div>
        </div>
      </div>

      {initError && (
        <div className="mb-3 p-2 text-sm rounded bg-red-100 text-red-700">
          {initError}
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Local Video */}
        <div className="relative bg-black rounded overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-24 object-cover"
          />
          <div className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
            You
          </div>
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <span className="text-gray-400 text-xs">Camera Off</span>
            </div>
          )}
        </div>

        {/* Remote Video */}
        <div className="relative bg-black rounded overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-24 object-cover"
          />
          <div className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
            Opponent
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 mb-3">
        <button
          onClick={toggleVideo}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            isVideoEnabled
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
          disabled={!localStreamRef.current}
        >
          {isVideoEnabled ? '📹' : '📹'}
        </button>
      </div>

      
    </div>
  );
};

export default VideoCamera;