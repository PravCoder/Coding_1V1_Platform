import React, { useRef, useEffect, useState } from 'react';
import getCurrentUser from "../hooks/getCurrentUser";

const VideoChat = ({ match_id, match, socketRef }) => {
  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  
  // State
  const [isLocalVideoEnabled, setIsLocalVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [error, setError] = useState(null);
  
  // Track if we've already initialized
  const isInitializedRef = useRef(false);
  const currentUserId = getCurrentUser();

  // WebRTC Configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Determine if we should initiate the connection (first player initiates)
  const shouldInitiate = () => {
    if (!match) return false;
    const firstPlayerId = match.first_player?._id || match.first_player;
    return currentUserId === firstPlayerId;
  };

  // Initialize local camera
  const initializeCamera = async () => {
    if (isInitializedRef.current || localStreamRef.current) {
      console.log('📹 Camera already initialized');
      return;
    }

    try {
      console.log('📹 Requesting camera access...');
      isInitializedRef.current = true;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false // You mentioned opponent can't hear, so audio is off
      });

      localStreamRef.current = stream;
      
      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsLocalVideoEnabled(true);
      setConnectionStatus('ready');
      console.log('📹 Camera initialized successfully');

      // Notify opponent that we're ready
      if (socketRef.current) {
        socketRef.current.emit('video_stream_ready', { 
          match_id, 
          user_id: currentUserId 
        });
      }

    } catch (err) {
      console.error('📹 Camera initialization failed:', err);
      setError('Failed to access camera: ' + err.message);
      setConnectionStatus('error');
      isInitializedRef.current = false;
    }
  };

  // Create peer connection
  const createPeerConnection = () => {
    if (peerConnectionRef.current) {
      console.log('📹 Peer connection already exists');
      return peerConnectionRef.current;
    }

    console.log('📹 Creating peer connection...');
    const peerConnection = new RTCPeerConnection(rtcConfig);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('📹 Adding local track:', track.kind);
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      console.log('📹 Received remote track');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnectionStatus('connected');
        console.log('📹 Remote video connected!');
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('📹 Sending ICE candidate');
        socketRef.current.emit('ice_candidate', {
          match_id,
          candidate: event.candidate,
          from_user_id: currentUserId
        });
      }
    };

    // Connection state monitoring
    peerConnection.onconnectionstatechange = () => {
      console.log('📹 Connection state:', peerConnection.connectionState);
      setConnectionStatus(peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'failed') {
        console.error('📹 Connection failed, attempting restart...');
        peerConnection.restartIce();
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('📹 ICE connection state:', peerConnection.iceConnectionState);
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  // Create and send offer
  const createOffer = async () => {
    try {
      console.log('📹 Creating offer...');
      const peerConnection = createPeerConnection();

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      console.log('📹 Sending offer to opponent');
      socketRef.current.emit('video_offer', {
        match_id,
        offer,
        from_user_id: currentUserId
      });

      setConnectionStatus('connecting');
    } catch (err) {
      console.error('📹 Error creating offer:', err);
      setError('Failed to create offer: ' + err.message);
    }
  };

  // Handle incoming offer
  const handleOffer = async (data) => {
    try {
      console.log('📹 Received offer from opponent');
      const peerConnection = createPeerConnection();

      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log('📹 Sending answer to opponent');
      socketRef.current.emit('video_answer', {
        match_id,
        answer,
        from_user_id: currentUserId
      });

      setConnectionStatus('connecting');
    } catch (err) {
      console.error('📹 Error handling offer:', err);
      setError('Failed to handle offer: ' + err.message);
    }
  };

  // Handle incoming answer
  const handleAnswer = async (data) => {
    try {
      console.log('📹 Received answer from opponent');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        console.log('📹 Answer processed successfully');
      }
    } catch (err) {
      console.error('📹 Error handling answer:', err);
      setError('Failed to handle answer: ' + err.message);
    }
  };

  // Handle incoming ICE candidate
  const handleIceCandidate = async (data) => {
    try {
      if (peerConnectionRef.current && data.candidate) {
        console.log('📹 Adding ICE candidate');
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    } catch (err) {
      console.error('📹 Error adding ICE candidate:', err);
    }
  };

  // Toggle local video on/off
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsLocalVideoEnabled(videoTrack.enabled);
        console.log('📹 Video toggled:', videoTrack.enabled ? 'ON' : 'OFF');
      }
    }
  };

  // Initialize camera on mount
  useEffect(() => {
    console.log('📹 VideoChat component mounted');
    initializeCamera();

    return () => {
      console.log('📹 Cleaning up video resources...');
      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('📹 Stopped track:', track.kind);
        });
      }
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        console.log('📹 Closed peer connection');
      }
    };
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (!socketRef.current) {
      console.log('📹 Socket not ready yet');
      return;
    }

    const socket = socketRef.current;

    // When opponent's stream is ready
    const handlePeerStreamReady = () => {
      console.log('📹 Opponent stream is ready');
      // If we're the initiator and haven't created connection yet
      if (shouldInitiate() && !peerConnectionRef.current) {
        console.log('📹 I am the initiator, creating offer...');
        setTimeout(() => createOffer(), 1000); // Small delay for stability
      } else {
        console.log('📹 Waiting for offer from opponent (they are the initiator)');
      }
    };

    const handleVideoOffer = (data) => {
      console.log('📹 Received video offer');
      handleOffer(data);
    };

    const handleVideoAnswer = (data) => {
      console.log('📹 Received video answer');
      handleAnswer(data);
    };

    const handleIceCandidateMsg = (data) => {
      console.log('📹 Received ICE candidate');
      handleIceCandidate(data);
    };

    // Register listeners
    socket.on('peer_stream_ready', handlePeerStreamReady);
    socket.on('video_offer', handleVideoOffer);
    socket.on('video_answer', handleVideoAnswer);
    socket.on('ice_candidate', handleIceCandidateMsg);

    console.log('📹 Socket listeners registered');

    // Cleanup
    return () => {
      socket.off('peer_stream_ready', handlePeerStreamReady);
      socket.off('video_offer', handleVideoOffer);
      socket.off('video_answer', handleVideoAnswer);
      socket.off('ice_candidate', handleIceCandidateMsg);
      console.log('📹 Socket listeners removed');
    };
  }, [match_id, match, socketRef.current]);

  // Status color helper
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'ready': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-[#2D2D2D] rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Video Chat</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-xs text-gray-400 capitalize">{connectionStatus}</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Your Video */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded text-white text-xs">
            You
          </div>
          {!isLocalVideoEnabled && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 text-sm">Off</div>
              </div>
            </div>
          )}
        </div>

        {/* Opponent Video */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded text-white text-xs">
            Opponent
          </div>
          {connectionStatus !== 'connected' && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 text-sm">
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Waiting for opponent...'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center">
        <button
          onClick={toggleVideo}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isLocalVideoEnabled
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          disabled={!localStreamRef.current}
        >
          {isLocalVideoEnabled ? 'camera on' : 'camera off'}
        </button>
      </div>
    </div>
  );
};

export default VideoChat;