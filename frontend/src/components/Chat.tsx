import React, { useState, useRef, useEffect } from 'react';
import { useWebSocketService, ChatMessage, ChatResponse } from '../utils/websocketService';
import { Mic, MicOff, Send, Play, Pause, AlertCircle, Wifi, WifiOff, LogIn, Key, ArrowLeft, Globe2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatProps {
  onClose?: () => void;
}

const Chat: React.FC<ChatProps> = ({ onClose }) => {
  const navigate = useNavigate();
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Read from the same localStorage setting as Home.tsx
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });
  
  // Listen for dark mode changes in localStorage from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'darkMode') {
        setIsDarkMode(e.newValue === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
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

  // State for back button
  const [isIconHovered, setIsIconHovered] = useState(false);

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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with title */}
      <header className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center">
        <div 
          className="cursor-pointer relative transition-all duration-200"
          onMouseEnter={() => setIsIconHovered(true)}
          onMouseLeave={() => setIsIconHovered(false)}
          onClick={() => navigate('/home')}
          aria-label="Return to home"
        >
          {isIconHovered ? (
            <ArrowLeft className="h-8 w-8 text-blue-500" />
          ) : (
            <Globe2 className="h-8 w-8 text-green-500" />
          )}
        </div>
        <h1 className="ml-3 text-2xl font-medium text-gray-800 dark:text-gray-100">Chat Assistant</h1>
      </header>

      {/* Connection status */}
      {state.error && (
        <div className="bg-red-100 text-red-700 p-2 flex items-center dark:bg-red-900 dark:text-red-200">
          <AlertCircle className="mr-2" size={16} />
          <span>{state.error}</span>
        </div>
      )}

      {/* Authentication error */}
      {isAuthError && (
        <div className={`p-4 ${isDarkMode ? 'bg-yellow-900 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border-b`}>
          <div className="flex flex-col items-center">
            <p className={`${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'} mb-2`}>Authentication required to use the chat.</p>
            <div className="flex space-x-2">
              <button
                onClick={handleLogin}
                className={`flex items-center px-4 py-2 rounded-lg ${isDarkMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'} text-white`}
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
        <div className={`p-4 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b`}>
          <form onSubmit={handleTokenSubmit} className="flex flex-col">
            <label htmlFor="token" className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
              Authentication Token
            </label>
            <div className="flex">
              <input
                type="text"
                id="token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className={`flex-1 px-3 py-2 border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'border-gray-300'} rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter your authentication token"
              />
              <button
                type="submit"
                className={`px-4 py-2 ${isDarkMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-r-md`}
              >
                Submit
              </button>
            </div>
            {tokenError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{tokenError}</p>
            )}
            <button
              type="button"
              onClick={() => setShowTokenInput(false)}
              className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 p-4 flex items-center justify-center">
        <div className="w-full max-w-4xl mx-auto rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <div className="p-6">
            {/* Connection controls */}
            <div className={`p-4 mb-4 rounded-lg ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              {!state.isConnected && !isAuthError ? (
                <button
                  onClick={handleConnect}
                  disabled={state.isConnecting}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-lg ${
                    state.isConnecting
                      ? 'bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400 cursor-not-allowed'
                      : isDarkMode 
                        ? 'bg-blue-700 text-white hover:bg-blue-800' 
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
                  <div className={`flex items-center ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    <div className={`w-2 h-2 ${isDarkMode ? 'bg-green-400' : 'bg-green-500'} rounded-full mr-2`}></div>
                    <span>Connected</span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className={`flex items-center px-3 py-1 rounded-lg ${
                      isDarkMode ? 'bg-red-900 text-red-300 hover:bg-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    <WifiOff size={16} className="mr-1" />
                    <span>Disconnect</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Messages area */}
            <div className={`p-4 rounded-lg min-h-[300px] flex flex-col ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
              {messages.length === 0 ? (
                <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} my-auto`}>
                  {state.isConnected ? (
                    <p>Start a conversation by recording a video message.</p>
                  ) : isAuthError ? (
                    <p>Please log in to use the chat.</p>
                  ) : (
                    <p>Connect to the server to start a conversation.</p>
                  )}
                </div>
              ) : (
                <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-8`}>
                  <p>Conversation in progress. Use the recording controls below to continue.</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Audio player */}
            {currentAudioUrl && (
              <div className={`p-4 mt-4 rounded-lg ${isDarkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-50 border-blue-200'} border`}>
                <div className="flex flex-col items-center">
                  <div className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} mb-2`}>Assistant's response:</div>
                  <div className="flex items-center justify-center">
                    {isPlaying ? (
                      <button 
                        onClick={pauseAudio}
                        className={`p-3 rounded-full ${
                          isDarkMode ? 'bg-blue-800 hover:bg-blue-700' : 'bg-blue-100 hover:bg-blue-200'
                        } transition-colors`}
                      >
                        <Pause size={24} className={isDarkMode ? 'text-blue-300' : 'text-blue-700'} />
                      </button>
                    ) : (
                      <button 
                        onClick={playAudio}
                        className={`p-3 rounded-full ${
                          isDarkMode ? 'bg-blue-800 hover:bg-blue-700' : 'bg-blue-100 hover:bg-blue-200'
                        } transition-colors`}
                      >
                        <Play size={24} className={isDarkMode ? 'text-blue-300' : 'text-blue-700'} />
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
            <div className={`p-4 mt-4 rounded-lg ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} border`}>
              <div className="flex justify-center space-x-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isProcessing || !state.isConnected}
                    className={`flex items-center px-4 py-2 rounded-full ${
                      isProcessing || !state.isConnected
                        ? 'bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400 cursor-not-allowed'
                        : isDarkMode 
                          ? 'bg-blue-700 text-white hover:bg-blue-800' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Mic className="mr-2" size={20} />
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className={`flex items-center px-4 py-2 rounded-full ${
                      isDarkMode ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
                  >
                    <MicOff className="mr-2" size={20} />
                    <span>Stop Recording</span>
                  </button>
                )}
              </div>
              
              {/* Processing indicator */}
              {isProcessing && (
                <div className={`mt-2 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p>Processing your video...</p>
                </div>
              )}
              
              {/* Error message (not connection related) */}
              {error && !error.includes("Not connected") && (
                <div className="mt-2 text-center text-sm text-red-500 dark:text-red-400">
                  <p>{error}</p>
                </div>
              )}
              
              {/* Connection status */}
              {!state.isConnected && hasAttemptedConnection && !isAuthError && (
                <div className="mt-2 text-center text-sm text-red-500 dark:text-red-400">
                  <p>Not connected to server. Please try connecting again.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="p-4 border-t border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400">
        Chat Assistant
      </footer>
    </div>
  );
};

export default Chat; 