import React, { useState, useRef, useEffect } from 'react';
import { useWebSocketService, ChatMessage, ChatResponse } from '../utils/websocketService';
import { Mic, MicOff, Send, Play, Pause, AlertCircle, Wifi, WifiOff, LogIn, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatProps {
  onClose?: () => void;
}

const Chat: React.FC<ChatProps> = ({ onClose }) => {
  const navigate = useNavigate();
  
  // WebSocket service hook
  const {
    connect,
    disconnect,
    sendVideo,
    state,
    messages,
    onMessageReceived
  } = useWebSocketService();

  // State for video recording
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);
  const [isAuthError, setIsAuthError] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Refs for video recording and audio playback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle audio playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  }, [currentAudioUrl]);

  // Check for authentication errors
  useEffect(() => {
    if (state.error && state.error.includes('Authentication failed')) {
      setIsAuthError(true);
    } else {
      setIsAuthError(false);
    }
  }, [state.error]);

  // Handle connection attempt
  const handleConnect = async () => {
    try {
      setError(null);
      setHasAttemptedConnection(true);
      setIsAuthError(false);
      await connect();
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      setError('Failed to connect to server. Please try again.');
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    try {
      console.log('Disconnecting from WebSocket...');
      
      // Stop any ongoing recording
      if (isRecording) {
        stopRecording();
      }
      
      // Stop any playing audio
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      
      // Disconnect from WebSocket
      disconnect();
      
      // Reset state
      setHasAttemptedConnection(false);
      setIsAuthError(false);
      
      console.log('Disconnected successfully');
    } catch (error) {
      console.error('Error during disconnect:', error);
      setError('Failed to disconnect properly. Please refresh the page.');
    }
  };

  // Handle login redirect
  const handleLogin = () => {
    navigate('/login');
  };

  // Handle manual token submission
  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError(null);
    
    if (!manualToken.trim()) {
      setTokenError('Token cannot be empty');
      return;
    }
    
    // Save token to localStorage
    localStorage.setItem('authToken', manualToken);
    
    // Hide token input
    setShowTokenInput(false);
    
    // Try connecting again
    handleConnect();
  };

  // Start recording video
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: true 
      });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/mp4' });
        await sendVideoToServer(videoBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access camera or microphone. Please check permissions.');
    }
  };

  // Stop recording video
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send video to server
  const sendVideoToServer = async (videoBlob: Blob) => {
    try {
      setIsProcessing(true);
      setError(null);
      await sendVideo(videoBlob);
    } catch (err) {
      console.error('Error sending video:', err);
      setError('Failed to send video to server. Please try again.');
      setIsProcessing(false);
    }
  };

  // Handle response from server
  const handleResponse = (response: any) => {
    console.log('Received response:', response);
    if (response.audio_path) {
      // Construct the full audio URL
      const fullAudioUrl = response.audio_path.startsWith('http') 
        ? response.audio_path 
        : `http://localhost:8000/chat${response.audio_path}`;
      
      setCurrentAudioUrl(fullAudioUrl);
      
      // Auto-play the audio response
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(error => {
              console.error('Error playing audio:', error);
              setError('Failed to play audio. Please try again.');
            });
        }
      }, 500);
    }
  };

  // Register callback for server responses
  useEffect(() => {
    const cleanup = onMessageReceived(handleResponse);
    return cleanup;
  }, [onMessageReceived]);

  // Play audio response
  const playAudio = () => {
    if (audioRef.current) {
      console.log('Playing audio from URL:', currentAudioUrl);
      
      // Play the audio
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(error => {
          console.error('Error playing audio:', error);
          setError(`Failed to play audio: ${error.message}`);
        });
    }
  };

  // Pause audio response
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Chat Assistant</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            ×
          </button>
        )}
      </div>

      {/* Connection status */}
      {state.error && (
        <div className="bg-red-100 text-red-700 p-2 flex items-center">
          <AlertCircle className="mr-2" size={16} />
          <span>{state.error}</span>
        </div>
      )}

      {/* Authentication error */}
      {isAuthError && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex flex-col items-center">
            <p className="text-yellow-700 mb-2">Authentication required to use the chat.</p>
            <div className="flex space-x-2">
              <button
                onClick={handleLogin}
                className="flex items-center px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
              >
                <LogIn className="mr-2" size={16} />
                <span>Log In</span>
              </button>
              <button
                onClick={() => setShowTokenInput(true)}
                className="flex items-center px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600"
              >
                <Key className="mr-2" size={16} />
                <span>Enter Token</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual token input */}
      {showTokenInput && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleTokenSubmit} className="flex flex-col">
            <label htmlFor="token" className="text-sm font-medium text-gray-700 mb-1">
              Authentication Token
            </label>
            <div className="flex">
              <input
                type="text"
                id="token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your authentication token"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
            {tokenError && (
              <p className="mt-1 text-sm text-red-600">{tokenError}</p>
            )}
            <button
              type="button"
              onClick={() => setShowTokenInput(false)}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Connection controls */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        {!state.isConnected && !isAuthError ? (
          <button
            onClick={handleConnect}
            disabled={state.isConnecting}
            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg ${
              state.isConnecting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {state.isConnecting ? (
              <>
                <span className="animate-pulse mr-2">Connecting...</span>
                <Wifi size={20} />
              </>
            ) : (
              <>
                <span>Connect to Server</span>
                <Wifi className="ml-2" size={20} />
              </>
            )}
          </button>
        ) : state.isConnected ? (
          <div className="flex justify-between items-center">
            <div className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Connected</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
            >
              <WifiOff size={16} className="mr-1" />
              <span>Disconnect</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            {state.isConnected ? (
              <p>Start a conversation by recording a video message.</p>
            ) : isAuthError ? (
              <p>Please log in to use the chat.</p>
            ) : (
              <p>Connect to the server to start a conversation.</p>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            <p>Conversation in progress. Use the recording controls below to continue.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Audio player */}
      {currentAudioUrl && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="flex flex-col items-center">
            <div className="text-sm text-blue-700 mb-2">Assistant's response:</div>
            <div className="flex items-center justify-center">
              {isPlaying ? (
                <button 
                  onClick={pauseAudio}
                  className="p-3 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
                >
                  <Pause size={24} className="text-blue-700" />
                </button>
              ) : (
                <button 
                  onClick={playAudio}
                  className="p-3 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
                >
                  <Play size={24} className="text-blue-700" />
                </button>
              )}
            </div>
          </div>
          <audio 
            ref={audioRef} 
            src={currentAudioUrl} 
            className="hidden" 
            preload="auto"
            onError={(e) => {
              console.error('Audio element error:', e);
              setError('Failed to load audio file. Please try again.');
            }}
          />
        </div>
      )}

      {/* Recording controls */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex justify-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isProcessing || !state.isConnected}
              className={`flex items-center px-4 py-2 rounded-full ${
                isProcessing || !state.isConnected
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Mic className="mr-2" size={20} />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700"
            >
              <MicOff className="mr-2" size={20} />
              <span>Stop Recording</span>
            </button>
          )}
        </div>
        
        {/* Processing indicator */}
        {isProcessing && (
          <div className="mt-2 text-center text-sm text-gray-500">
            <p>Processing your video...</p>
          </div>
        )}
        
        {/* Connection status */}
        {!state.isConnected && hasAttemptedConnection && !isAuthError && (
          <div className="mt-2 text-center text-sm text-red-500">
            <p>Not connected to server. Please try connecting again.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat; 