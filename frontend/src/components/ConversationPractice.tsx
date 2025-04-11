import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, PhoneOff, Camera, CameraOff, Globe2, ArrowLeft, Play, Pause, AlertCircle, Wifi, WifiOff, LogIn, Key } from 'lucide-react';
// @ts-ignore
import { useWebSocketService, ChatMessage, ChatResponse } from '../utils/websocketService';
import axios from 'axios';

interface Scenario {
  id: string;
  title: string;
  description: string;
  initial_prompt: string;
  context: string;
  difficulty_level: string;
}

// Mapping from module ID to title
const moduleTitles: { [key: string]: string } = {
  '1': 'Formal Conversations',
  '2': 'Informal Conversations',
  '3': 'Presentations',
  '4': 'Networking',
};

const ConversationPractice: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  
  // State for scenario
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [showScenarioSelection, setShowScenarioSelection] = useState(true);
  
  // WebSocket service hook
  const {
    connect,
    disconnect,
    sendVideo,
    state,
    messages,
    onMessageReceived
  } = useWebSocketService();

  // State for video recording and audio playback
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [conversationDuration, setConversationDuration] = useState<string>("00:00");
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isIconHovered, setIsIconHovered] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(true);
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
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState<number | null>(null);
  const [silenceThreshold, setSilenceThreshold] = useState(1500); // 1.5 seconds of silence to stop recording
  const [conversationChunks, setConversationChunks] = useState<Blob[]>([]); // Store all recorded chunks
  const [isConversationComplete, setIsConversationComplete] = useState(false); // Flag to indicate conversation is complete
  const [showAnalysisButton, setShowAnalysisButton] = useState(false);

  // Refs for video recording, audio playback, and visualization
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const moduleTitle = moduleId ? moduleTitles[moduleId] || 'Practice' : 'Practice';

  // Fetch scenarios when component mounts
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:8000/scenarios/scenarios', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        setScenarios(response.data);
      } catch (error) {
        console.error('Error fetching scenarios:', error);
        setError('Failed to load scenarios. Please try again.');
      }
    };

    fetchScenarios();
  }, [navigate]);

  // Handle scenario selection
  const handleScenarioSelect = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setShowScenarioSelection(false);
  };

  // Effect to set the document title
  useEffect(() => {
    document.title = `RealTalk | ${moduleTitle}`;
    
    // Start the timer when component mounts
    startTimeRef.current = new Date();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current && !isTimerPaused) {
        const elapsedSeconds = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
        const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
        setConversationDuration(`${minutes}:${seconds}`);
      }
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [moduleTitle, isTimerPaused]);

  // Set up audio visualization and speech detection
  useEffect(() => {
    if (stream && !isMuted) {
      // Create audio context and analyzer if they don't exist
      if (!audioContextRef.current) {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }

      // Connect the stream to the analyzer
      const source = audioContextRef.current.createMediaStreamSource(stream);
      if (analyserRef.current) {
        source.connect(analyserRef.current);
      }
      
      // Start the animation loop for audio visualization
      const updateAudioVisualization = () => {
        if (!analyserRef.current || !audioDataRef.current) return;
        
        analyserRef.current.getByteFrequencyData(audioDataRef.current);
        
        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < audioDataRef.current.length; i++) {
          sum += audioDataRef.current[i];
        }
        const average = sum / audioDataRef.current.length;
        
        // Normalize to 0-1 range (typical speech is around 30-50 in a 0-255 range)
        // We divide by 100 to get a reasonable scale, then clamp to 0-1
        const normalizedLevel = Math.min(1, Math.max(0, average / 100));
        
        // Determine if the user is speaking based on volume threshold
        const isSpeakingNow = normalizedLevel > 0.15;
        
        // Handle speech detection for auto-recording
        if (state.isConnected && !isPlaying) {
          if (isSpeakingNow) {
            // User is speaking
            setLastSpeechTime(Date.now());
            
            // Clear any existing silence timer
            if (silenceTimer) {
              clearTimeout(silenceTimer);
              setSilenceTimer(null);
            }
            
            // Start recording if not already recording
            if (!isRecording && !isProcessing) {
              startRecording();
            }
          } else if (lastSpeechTime) {
            // User stopped speaking, start silence timer
            if (!silenceTimer) {
              const timer = setTimeout(() => {
                // If silence continues for the threshold duration, stop recording
                if (isRecording) {
                  stopRecording();
                  
                  // Show a visual indicator that the message was sent
                  setError("Message sent! Waiting for assistant's response...");
                  setTimeout(() => {
                    setError(null);
                  }, 3000);
                }
                setSilenceTimer(null);
              }, silenceThreshold);
              
              setSilenceTimer(timer);
            }
          }
        }
        
        setIsSpeaking(isSpeakingNow);
        
        // Set audio level for visualization (scale it a bit for better visual effect)
        setAudioLevel(isSpeakingNow ? normalizedLevel : 0);
        
        // Continue the animation loop
        animationFrameRef.current = requestAnimationFrame(updateAudioVisualization);
      };
      
      animationFrameRef.current = requestAnimationFrame(updateAudioVisualization);
      
      // Clean up function
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        source.disconnect();
      };
    } else {
      // If stream is unavailable or muted, reset speaking state
      setIsSpeaking(false);
      setAudioLevel(0);
    }
  }, [stream, isMuted, isRecording, isProcessing, lastSpeechTime, silenceTimer, state.isConnected, isPlaying]);

  // Handle response from server
  const handleResponse = (response: any) => {
    console.log('Received response:', response);
    setIsProcessing(false);
    
    if (response.audio_path) {
      // Construct the full audio URL
      const fullAudioUrl = response.audio_path.startsWith('http') 
        ? response.audio_path 
        : `http://localhost:8000/chat${response.audio_path}`;
      
      setCurrentAudioUrl(fullAudioUrl);
      
      // Auto-play the audio when it's loaded
      setTimeout(() => {
        if (audioRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                setError(null);
              })
              .catch(error => {
                console.error('Error auto-playing audio:', error);
                setError('Failed to auto-play audio. Please try again.');
                setIsPlaying(false);
              });
          }
        }
      }, 500); // Small delay to ensure audio is loaded
    }
  };

  // Handle audio playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsPlaying(false);
        
        // Small delay to ensure audio is fully stopped
        setTimeout(() => {
          // Reset speech detection state to prepare for user's next turn
          setLastSpeechTime(null);
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            setSilenceTimer(null);
          }
        }, 500);
      };

      audioRef.current.onerror = (e) => {
        console.error('Audio element error:', e);
        setError('Failed to load audio file. Please try again.');
        setIsPlaying(false);
      };

      // Load the audio when URL changes
      if (currentAudioUrl) {
        audioRef.current.load();
      }
    }
  }, [currentAudioUrl, silenceTimer]);

  // Check for authentication errors
  useEffect(() => {
    if (state.error && state.error.includes('Authentication failed')) {
      setIsAuthError(true);
    } else {
      setIsAuthError(false);
    }
  }, [state.error]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const getMediaPermissions = async () => {
      try {
        // Request audio only initially
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
        
        // Mute audio tracks by default
        mediaStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
        
        setStream(mediaStream);
        setPermissionError(null);
      } catch (err) {
        console.error('Error accessing media devices.', err);
        if (err instanceof Error) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError('Permission denied. Please allow microphone access in your browser settings.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setPermissionError('No microphone found. Please ensure it is connected and enabled.');
            } else {
                setPermissionError(`An error occurred: ${err.message}`);
            }
        } else {
            setPermissionError('An unknown error occurred while accessing media devices.');
        }
      }
    };

    getMediaPermissions();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
      
      // Clean up audio context resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []); 

  // Handle connection attempt with scenario
  const handleConnect = async () => {
    try {
      setError(null);
      setHasAttemptedConnection(true);
      setIsAuthError(false);
      await connect(selectedScenario?.id);
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
      
      // Clear any silence timer
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }
      
      // Disconnect from WebSocket
      disconnect();
      
      // Reset state
      setHasAttemptedConnection(false);
      setIsAuthError(false);
      setCurrentAudioUrl(null); // Clear the audio URL
      setError(null); // Clear any error messages
      
      // If we have conversation chunks, show the analysis button
      if (conversationChunks.length > 0) {
        console.log("We have chunks after disconnect, showing analysis button");
        setShowAnalysisButton(true);
      }
      
      // Force a re-render to clear the connection status message
      setTimeout(() => {
        // This is a workaround to ensure the error state is cleared
        // The WebSocket service might set the error state after disconnect is called
        setError(null);
      }, 100);
      
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
    localStorage.setItem('access_token', manualToken);
    
    // Hide token input
    setShowTokenInput(false);
    
    // Try connecting again
    handleConnect();
  };

  const toggleMute = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      // Turn off camera
      stream?.getVideoTracks().forEach(track => {
        track.stop();
      });
      // Remove video tracks from the stream
      setStream(prev => {
        if (prev) {
          const audioTracks = prev.getAudioTracks();
          const newStream = new MediaStream();
          audioTracks.forEach(track => newStream.addTrack(track));
          return newStream;
        }
        return prev;
      });
      setIsCameraOn(false);
    } else {
      // Turn on camera
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        
        // Add video track to existing stream
        setStream(prev => {
          if (prev) {
            const newStream = new MediaStream();
            // Add existing audio tracks
            prev.getAudioTracks().forEach(track => newStream.addTrack(track));
            // Add new video track
            newStream.addTrack(videoTrack);
            return newStream;
          }
          return videoStream;
        });
        
        setIsCameraOn(true);
      } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Could not access camera. Please check your camera permissions.');
      }
    }
  };

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Check if media devices are ready
  const areMediaDevicesReady = () => {
    return stream !== null && 
           stream.getAudioTracks().length > 0 && 
           !isMuted &&
           stream.getVideoTracks().length > 0 &&
           isCameraOn;
  };

  // Start recording video
  const startRecording = async () => {
    try {
      setError(null);
      
      // Check if media devices are ready
      if (!areMediaDevicesReady()) {
        setError('Please enable both microphone and camera before recording.');
        return;
      }
      
      // If we don't have a stream yet, get one
      if (!stream) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: isCameraOn,
          audio: true 
        });
        setStream(mediaStream);
      }
      
      // Create a new MediaRecorder with the current stream
      if (stream) {
        // Use WebM with VP8 and Opus codecs with specific constraints
        const webmOptions = {
          mimeType: 'video/webm;codecs=vp8,opus',
          videoBitsPerSecond: 1000000, // 1 Mbps
          audioBitsPerSecond: 128000,  // 128 kbps
          videoSize: { width: 640, height: 480 }, // Reduced resolution
          frameRate: 15 // Reduced framerate
        };
        
        // Check if the browser supports WebM with VP8 and Opus
        if (MediaRecorder.isTypeSupported(webmOptions.mimeType)) {
          console.log('Using WebM with VP8 and Opus codecs');
          const mediaRecorder = new MediaRecorder(stream, webmOptions);
          mediaRecorderRef.current = mediaRecorder;
        } else {
          console.warn('WebM with VP8 and Opus not supported, falling back to default');
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
        }
        
        // Log the actual MIME type being used
        console.log('MediaRecorder MIME type:', mediaRecorderRef.current.mimeType);
        
        videoChunksRef.current = [];

        // Set a smaller timeslice to get more frequent chunks (every 500ms)
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            videoChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          // Add the current recording chunks to the conversation chunks
          if (videoChunksRef.current.length > 0) {
            setConversationChunks(prevChunks => [...prevChunks, ...videoChunksRef.current]);
          }
          
          // If this is the final recording (conversation is complete), send the full conversation
          if (isConversationComplete) {
            await sendFullConversation();
          } else {
            // Otherwise, just send the current recording
            const videoBlob = new Blob(videoChunksRef.current, { 
              type: mediaRecorderRef.current?.mimeType || 'video/webm' 
            });
            await sendVideoToServer(videoBlob);
          }
        };

        // Start recording with a 500ms timeslice to get more frequent chunks
        mediaRecorderRef.current.start(500);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access camera or microphone. Please check permissions.');
    }
  };

  // Stop recording video
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("Stopping recording, not sending to server");
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Don't send the video to the server when stopping recording
      // The video chunks are already stored in conversationChunks
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

  // Register callback for server responses
  useEffect(() => {
    const cleanup = onMessageReceived(handleResponse);
    return cleanup;
  }, [onMessageReceived]);

  // Play audio response
  const playAudio = () => {
    if (audioRef.current && currentAudioUrl) {
      console.log('Playing audio from URL:', currentAudioUrl);
      
      // If we're recording, stop recording when assistant starts speaking
      if (isRecording) {
        stopRecording();
      }
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setError(null);
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            setError('Failed to play audio. Please try again.');
            setIsPlaying(false);
          });
      }
    }
  };

  // Pause audio response
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const endCall = () => {
    console.log("End call pressed. Chunks:", conversationChunks.length);
    console.log("Current showAnalysisButton state:", showAnalysisButton);
    
    // If we have recorded chunks, show the analysis button
    if (conversationChunks.length > 0) {
      console.log("We have chunks, showing analysis button");
      
      // If we're currently recording, stop it
      if (isRecording) {
        console.log("Stopping recording");
        stopRecording();
      }
      
      // Show the analysis button after ending the call
      setShowAnalysisButton(true);
      console.log("Analysis button should be visible now");
      
      // Disconnect from WebSocket if connected
      if (state.isConnected) {
        console.log("Disconnecting from WebSocket");
        handleDisconnect();
      }
      
      // Don't navigate away - let the user see the analysis button
      // navigate('/home');
    } else {
      console.log("No chunks recorded, ending call normally");
      // If no chunks recorded, just end the call normally
      // Stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Clean up audio context
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      // Clear any silence timer
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }
      
      // Disconnect from WebSocket if connected
      if (state.isConnected) {
        handleDisconnect();
      } else {
        // Reset state even if not connected
        setCurrentAudioUrl(null);
        setError(null);
        setHasAttemptedConnection(false);
        setIsAuthError(false);
      }
      
      // Navigate back to dashboard
      navigate('/home');
    }
  };

  // Calculate the bubble size based on audio level
  const getBubbleSize = () => {
    // Base size is 9.5rem, we'll scale up to 1.4x based on audio level (increased by 30%)
    const baseSize = 9.5;
    const maxScale = 1.4;
    const scale = 1 + (audioLevel * (maxScale - 1));
    return {
      width: `${baseSize * scale}rem`,
      height: `${baseSize * scale}rem`,
    };
  };

  const toggleTimer = () => {
    setIsTimerPaused(!isTimerPaused);
  };

  // Send full conversation to server
  const sendFullConversation = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Combine all conversation chunks into one blob with the correct MIME type
      const fullConversationBlob = new Blob(conversationChunks, { 
        type: 'video/webm' // Use WebM format instead of MP4
      });
      
      // Send the full conversation to the server
      await sendVideo(fullConversationBlob);
      
      // Don't reset conversation chunks after sending - we need them for analysis
      // setConversationChunks([]);
      // setIsConversationComplete(false);
      
      // Show the analysis button after sending the full conversation
      setShowAnalysisButton(true);
      
      setIsProcessing(false);
    } catch (err) {
      console.error('Error sending full conversation:', err);
      setError('Failed to send full conversation to server. Please try again.');
      setIsProcessing(false);
    }
  };

  // Navigate to analysis page with the full conversation video
  const navigateToAnalysis = () => {
    if (conversationChunks.length > 0) {
      console.log("Navigating to analysis with", conversationChunks.length, "chunks");
      
      try {
        // Create a single blob from all chunks
        const finalBlob = new Blob(conversationChunks, { 
          type: 'video/webm;codecs=vp8,opus'
        });
        
        // Navigate to analysis with the combined video
        navigate(`/practice/analysis/${moduleId}`, {
          state: {
            videoBlob: finalBlob,
            moduleId: moduleId,
            scenarioId: selectedScenario?.id
          }
        });
      } catch (error) {
        console.error('Error processing video chunks:', error);
        setError('Failed to process video. Please try again.');
      }
    } else {
      setError('No conversation recorded yet. Please record a conversation first.');
    }
  };

  // MediaRecorder event handlers
  useEffect(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Data available from recorder, size:", event.data.size);
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log("MediaRecorder stopped, chunks:", videoChunksRef.current.length);
        
        // Add to conversation chunks for later analysis
        if (videoChunksRef.current.length > 0) {
          const newChunks = [...videoChunksRef.current];
          setConversationChunks(prevChunks => [...prevChunks, ...newChunks]);
          console.log("Added chunks to conversation, total:", conversationChunks.length + newChunks.length);
          
          // Only send the current chunk to the server if we're still connected
          if (state.isConnected) {
            console.log("WebSocket still connected, sending video to server");
            const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
            await sendVideoToServer(videoBlob);
          } else {
            console.log("WebSocket not connected, skipping video send");
          }
        } else {
          console.log("No new chunks when stopping recording");
        }
      };
    }
  }, [mediaRecorderRef.current, state.isConnected]);

  // Add a useEffect to log when showAnalysisButton changes
  useEffect(() => {
    console.log("showAnalysisButton changed to:", showAnalysisButton);
  }, [showAnalysisButton]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Scenario Selection Modal */}
      {showScenarioSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Select a Scenario</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => handleScenarioSelect(scenario)}
                >
                  <h3 className="font-semibold text-gray-800 dark:text-white">{scenario.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{scenario.description}</p>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Difficulty: {scenario.difficulty_level}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
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
          <h1 className="ml-3 text-2xl font-medium text-gray-800 dark:text-gray-100">{moduleTitle}</h1>
        </header>

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

        {/* Add scenario info if selected */}
        {selectedScenario && !showScenarioSelection && (
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 dark:text-white">{selectedScenario.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{selectedScenario.description}</p>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Difficulty: {selectedScenario.difficulty_level}
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 p-4 flex items-center justify-center">
          <div className="w-full max-w-4xl mx-auto rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
            {permissionError ? (
              <div className="p-8 text-center">
                <div className="text-red-500 mb-4">⚠️ {permissionError}</div>
                <button 
                  onClick={() => navigate('/home')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <div className="p-12 flex flex-col">
                {/* Call interface */}
                <div className="flex items-center justify-center min-h-[240px]">
                  {/* Participant info - Left side */}
                  <div className="w-1/5 text-left">
                    <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">Time</h2>
                    <div className="text-lg font-normal text-gray-500 dark:text-gray-400">{conversationDuration}</div>
                    <div className="text-lg font-normal text-green-600 dark:text-green-500">Fidupia</div>
                  </div>
                  
                  {/* Avatar/Video - Center */}
                  <div className="w-3/5 flex justify-center">
                    <div className="relative flex items-center justify-center">
                      {/* Outer ring - appears with sound when camera is off */}
                      {!isCameraOn && (
                        <div 
                          style={{
                            width: `${12 * (isSpeaking ? 1 + (audioLevel * 0.4) : 0.9)}rem`,
                            height: `${12 * (isSpeaking ? 1 + (audioLevel * 0.4) : 0.9)}rem`,
                            opacity: isSpeaking ? 0.3 : 0,
                            transition: isSpeaking 
                              ? 'width 0.18s ease-out, height 0.18s ease-out, opacity 0.3s ease-out' 
                              : 'width 0.08s ease-in, height 0.08s ease-in, opacity 0.15s ease-in',
                          }}
                          className="absolute rounded-full bg-green-100 dark:bg-green-900"
                        ></div>
                      )}
                      
                      {/* Middle ring - always visible but expands when camera is off */}
                      {!isCameraOn && (
                        <div 
                          style={{
                            width: `${11 * (isSpeaking ? 1 + (audioLevel * 0.2) : 0.95)}rem`,
                            height: `${11 * (isSpeaking ? 1 + (audioLevel * 0.2) : 0.95)}rem`,
                            opacity: isSpeaking ? 0.6 : 0.2,
                            transition: isSpeaking 
                              ? 'width 0.16s ease-out, height 0.16s ease-out, opacity 0.25s ease-out' 
                              : 'width 0.07s ease-in, height 0.07s ease-in, opacity 0.12s ease-in',
                          }}
                          className="absolute rounded-full bg-green-50 dark:bg-green-800"
                        ></div>
                      )}
                      
                      {/* Inner content - either bubble or video */}
                      <div 
                        style={{
                          ...getBubbleSize(),
                          opacity: 0.8,
                          transition: isSpeaking 
                            ? 'width 0.15s ease-out, height 0.15s ease-out' 
                            : 'width 0.08s ease-in, height 0.08s ease-in',
                        }}
                        className={`rounded-full flex items-center justify-center ${
                          isSpeaking
                            ? 'bg-green-300 dark:bg-green-600' 
                            : 'bg-green-200 dark:bg-green-700'
                        }`}
                      >
                        {/* Dynamic bubble with no emoji content */}
                      </div>
                      
                      {/* Hidden video element for recording */}
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="hidden"
                      />
                    </div>
                  </div>
                  
                  {/* Controls - Right side */}
                  <div className="w-1/5 flex flex-col items-end gap-4 pr-1">
                    <button
                      onClick={toggleCamera}
                      className={`flex items-center justify-center w-14 h-14 rounded-full ${isCameraOn 
                        ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                      aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
                    >
                      {isCameraOn ? <Camera size={25} /> : <CameraOff size={25} />}
                    </button>
                    
                    <button
                      onClick={toggleMute}
                      className={`flex items-center justify-center w-14 h-14 rounded-full ${isMuted 
                        ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      <Mic size={25} className={isMuted ? 'hidden' : 'block'} />
                      <MicOff size={25} className={isMuted ? 'block' : 'hidden'} />
                    </button>

                    <button
                      onClick={!state.isConnected ? handleConnect : toggleTimer}
                      disabled={!state.isConnected ? (state.isConnecting || !areMediaDevicesReady()) : false}
                      className={`flex items-center justify-center w-14 h-14 rounded-full ${
                        !state.isConnected
                          ? state.isConnecting || !areMediaDevicesReady()
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-green-500 text-white hover:bg-green-600'
                          : isTimerPaused
                            ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                      aria-label={!state.isConnected ? "Connect to server" : (isTimerPaused ? "Resume timer" : "Pause timer")}
                    >
                      {!state.isConnected ? (
                        state.isConnecting ? (
                          <div className="animate-spin">
                            <Wifi size={25} />
                          </div>
                        ) : (
                          <Play size={25} />
                        )
                      ) : (
                        isTimerPaused ? <Play size={25} /> : <Pause size={25} />
                      )}
                    </button>
                    
                    <button
                      onClick={state.isConnected ? handleDisconnect : endCall}
                      className={`flex items-center justify-center w-14 h-14 rounded-full ${
                        state.isConnected 
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      aria-label={state.isConnected ? "Disconnect" : "End call"}
                    >
                      <PhoneOff size={25} />
                    </button>
                  </div>
                </div>

                {/* Messages area */}
                <div className="mt-8 flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      {state.isConnected ? (
                        <p>Start a conversation by speaking.</p>
                      ) : isAuthError ? (
                        <p>Please log in to use the chat.</p>
                      ) : (
                        <p>Connect to the server to start a conversation.</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 mt-8">
                      <p>Conversation in progress. Speak to continue.</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Hidden audio element for playback */}
                <audio 
                  ref={audioRef} 
                  src={currentAudioUrl || undefined} 
                  className="hidden" 
                  preload="auto"
                />

                {/* Recording controls */}
                <div className="mt-4 p-4 border-t border-gray-200">
                  <div className="flex justify-center space-x-4">
                    {state.isConnected && (
                      <div className="flex flex-col items-center">
                        <div className="text-sm text-green-600 mb-2">
                          {isPlaying 
                            ? "Assistant is speaking..." 
                            : isRecording 
                              ? "Recording in progress..." 
                              : "Speak to start recording"}
                        </div>
                        {conversationChunks.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {conversationChunks.length} recording segment{conversationChunks.length !== 1 ? 's' : ''} collected
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Media device status */}
                  {!areMediaDevicesReady() && (
                    <div className="mt-2 text-center text-sm text-amber-600">
                      <p>Please enable both microphone and camera before connecting.</p>
                    </div>
                  )}
                  
                  {/* Processing indicator */}
                  {isProcessing && (
                    <div className="mt-2 text-center text-sm text-gray-500">
                      <p>{isConversationComplete ? "Processing full conversation..." : "Processing your video..."}</p>
                    </div>
                  )}
                  
                  {/* Message sent indicator */}
                  {error && error.includes("Message sent") && (
                    <div className="mt-2 text-center text-sm text-green-500">
                      <p>{error}</p>
                    </div>
                  )}
                  
                  {/* Connection status */}
                  {!state.isConnected && hasAttemptedConnection && !isAuthError && (
                    <div className="mt-2 text-center text-sm text-red-500">
                      <p>Not connected to server. Please try connecting again.</p>
                    </div>
                  )}

                  {/* Analysis button - only show after ending the call */}
                  {showAnalysisButton && conversationChunks.length > 0 && !isRecording && !isProcessing && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={navigateToAnalysis}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                        Analyze Conversation
                      </button>
                    </div>
                  )}

                  {/* Debug info */}
                  <div className="mt-2 text-center text-xs text-gray-400">
                    <p>Debug: Chunks: {conversationChunks.length}, Show Button: {showAnalysisButton ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        
        {/* Footer with module info */}
        <footer className="p-4 border-t border-gray-200 dark:border-gray-800 text-center text-gray-500 dark:text-gray-400">
          {moduleTitle} practice session
          
        </footer>
      </div>
    </div>
  );
};

export default ConversationPractice;