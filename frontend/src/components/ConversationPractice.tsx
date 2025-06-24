import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, PhoneOff, Camera, CameraOff, Globe2, ArrowLeft, Play, Pause, AlertCircle, Wifi, WifiOff, LogIn, RefreshCw, User, AudioLines } from 'lucide-react';
// @ts-ignore
import { useWebSocketService, ChatMessage, ChatResponse } from '../utils/websocketService';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface Scenario {
  id: string;
  title: string;
  description: string;
  initial_prompt: string;
  context: string;
  difficulty_level: string;
}

const ConversationPractice: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get selectedScenario from navigation state
  const selectedScenario = location.state?.selectedScenario as Scenario | null;
  
  // Add logging to check scenario data
  useEffect(() => {
    if (selectedScenario) {
      // Removed debug logging
    }
  }, [selectedScenario]);
  
  // Redirect to home if no scenario is selected
  useEffect(() => {
    if (!selectedScenario && !location.state) {
      navigate('/home');
    }
  }, [selectedScenario, navigate, location]);
  
  // State for scenario - simplified
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  // WebSocket service hook
  const {
    connect,
    disconnect,
    sendVideo,
    state,
    messages,
    onMessageReceived,
    handleAudioComplete,
    onEndCall
  } = useWebSocketService();

  // State for video recording and audio playback
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [conversationDuration, setConversationDuration] = useState<string>("00:00");
  const [isMuted, setIsMuted] = useState(() => {
    const savedIsMuted = localStorage.getItem('isMuted');
    return savedIsMuted ? JSON.parse(savedIsMuted) : true;
  });
  const [isCameraOn, setIsCameraOn] = useState(() => {
    const savedIsCameraOn = localStorage.getItem('isCameraOn');
    return savedIsCameraOn ? JSON.parse(savedIsCameraOn) : false;
  });
  const [isHovering, setIsHovering] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState<number | null>(null);
  const [silenceThreshold, setSilenceThreshold] = useState(1100); 
  const [inactivityTimeout, setInactivityTimeout] = useState(30000);
  const [lastActivityTime, setLastActivityTime] = useState<number | null>(null);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [conversationChunks, setConversationChunks] = useState<Blob[]>([]); // Store all recorded chunks
  const [showAnalysisButton, setShowAnalysisButton] = useState(false);
  const [isConversationComplete, setIsConversationComplete] = useState(false);
  const [hasConversationEnded, setHasConversationEnded] = useState(false); // New state variable
  const [showUserCamera, setShowUserCamera] = useState(false);

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
  
  // Add timestamp tracking
  const lastMessageTimestamp = useRef<number | null>(null);
  
  // Add ref to track current stream for proper cleanup
  const streamRef = useRef<MediaStream | null>(null);
  
  // Add new state for smoothed audio level
  const [smoothedAudioLevel, setSmoothedAudioLevel] = useState(0);
  const lastAudioLevelRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const ANIMATION_UPDATE_INTERVAL = 50; // Reduced from 100ms to 50ms for more responsiveness
  
  const parseDurationToSeconds = (duration: string): number => {
    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        return (minutes * 60) + seconds;
      }
    }
    console.warn(`Failed to parse duration: ${duration}`); // Log a warning if parsing fails
    return 0; // Default to 0 if parsing fails or format is incorrect
  };
  
  // Fetch scenarios when component mounts - we can simplify this
  useEffect(() => {
    // Only validate token, don't need to fetch scenarios anymore
    const validateToken = async () => {
      try {
        if (!session) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth error:', error);
        setError('Authentication failed. Please log in again.');
      }
    };

    validateToken();
  }, [navigate, session]);

  // Effect to set the document title
  useEffect(() => {
    const title = selectedScenario ? selectedScenario.title : 'Conversation Practice';
    document.title = `RealTalk | ${title}`;

    if (!isTimerPaused) {
      // Set/reset start time only when the timer is supposed to be active (i.e., connected)
      startTimeRef.current = new Date(); 
      timerRef.current = setInterval(() => {
        // Ensure startTimeRef.current is set (it should be if we're in this block)
        if (startTimeRef.current) { 
          const elapsedSeconds = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
          const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
          const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
          setConversationDuration(`${minutes}:${seconds}`);
        }
      }, 1000);
    } else {
      // If timer is paused (i.e., disconnected or initially), clear any existing interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null; 
      }
      // The timer display will freeze at its last value. 
      // If reset to "00:00" is desired upon disconnect, add setConversationDuration("00:00"); here.
    }
    
    // Cleanup function: always clear the interval on unmount or before the effect re-runs
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [selectedScenario, isTimerPaused]);

  // Update the audio visualization effect
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
        
        const now = Date.now();
        if (now - lastUpdateTimeRef.current < ANIMATION_UPDATE_INTERVAL) {
          animationFrameRef.current = requestAnimationFrame(updateAudioVisualization);
          return;
        }
        
        lastUpdateTimeRef.current = now;
        
        analyserRef.current.getByteFrequencyData(audioDataRef.current);
        
        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < audioDataRef.current.length; i++) {
          sum += audioDataRef.current[i];
        }
        const average = sum / audioDataRef.current.length;
        
        // Normalize to 0-1 range (typical speech is around 30-50 in a 0-255 range)
        const normalizedLevel = Math.min(1, Math.max(0, average / 100));
        
        // Apply smoothing to the audio level with increased responsiveness
        const smoothingFactor = 0.4; // Increased from 0.3 to 0.4 for more responsiveness
        const smoothedLevel = lastAudioLevelRef.current * (1 - smoothingFactor) + normalizedLevel * smoothingFactor;
        lastAudioLevelRef.current = smoothedLevel;
        
        // Determine if the user is speaking based on volume threshold
        const isSpeakingNow = smoothedLevel > 0.15;
        
        // Handle speech detection for auto-recording
        if (state.isConnected && !isPlaying) {
          if (isSpeakingNow) {
            setLastSpeechTime(Date.now());
            setLastActivityTime(Date.now());
            
            if (silenceTimer) {
              clearTimeout(silenceTimer);
              setSilenceTimer(null);
            }
            
            if (inactivityTimer) {
              clearTimeout(inactivityTimer);
              setInactivityTimer(null);
            }
            
            if (!isRecording && !isProcessing) {
              startRecording();
            }
          } else {
            const now = Date.now();
            const timeSinceLastActivity = lastActivityTime ? now - lastActivityTime : 0;
            
            if (timeSinceLastActivity >= inactivityTimeout && state.isConnected && !isRecording && !isProcessing) {
              setError("Conversation ended due to inactivity.");
              endCall();
            }
            
            if (lastSpeechTime && !silenceTimer) {
              const timer = setTimeout(() => {
                if (isRecording) {
                  stopRecording();
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
        setSmoothedAudioLevel(smoothedLevel);
        
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
        if (inactivityTimer) {
          clearTimeout(inactivityTimer);
        }
        source.disconnect();
      };
    } else {
      setIsSpeaking(false);
      setSmoothedAudioLevel(0);
    }
  }, [stream, isMuted, isRecording, isProcessing, lastSpeechTime, silenceTimer, state.isConnected, isPlaying]);

  const handleResponse = (response: any) => {
    setIsProcessing(false);

    // Calculate latency if we have a timestamp
    if (lastMessageTimestamp.current) {
      const latency = Date.now() - lastMessageTimestamp.current;
      lastMessageTimestamp.current = null;
    }

    // Check for error messages
    if (response.error) {
      setError(response.error);
      // If it's an ffmpeg error, end the call
      if (response.error.toLowerCase().includes('ffmpeg')) {
        endCall();
      }
      return;
    }

    if (response.audioUrl) {
      setCurrentAudioUrl(response.audioUrl);

      setTimeout(() => {
        if (audioRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                setError(null);
                
                // Set up standard completion handler
                audioRef.current!.onended = () => {
                  setIsPlaying(false);
                  handleAudioComplete(); // Notify that playback is complete
                };
              })
              .catch(error => {
                setError('Failed to auto-play audio. Please try again.');
                setIsPlaying(false);
                handleAudioComplete(); // Notify that playback failed
              });
          }
        }
      }, 500); // small delay to ensure audio loads
    }
  };

  // Handle audio playback completion
  // Removed this useEffect as it was conflicting with the end trigger handler
  // The end trigger handler in handleResponse will handle all audio completion cases

  useEffect(() => {
    const getMediaPermissions = async () => {
      try {
        // Always request both audio and video permissions
        const constraints = {
          audio: true,
          video: true
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set initial track states based on stored preferences
        mediaStream.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
        });

        mediaStream.getVideoTracks().forEach(track => {
          track.enabled = isCameraOn;
        });
        
        // Update both state and ref
        setStream(mediaStream);
        streamRef.current = mediaStream;
        setPermissionError(null);
      } catch (err) {
        console.error('Error accessing media devices.', err);
        if (err instanceof Error) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError('Permission denied. Please allow microphone and camera access in your browser settings.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setPermissionError('No microphone or camera found. Please ensure they are connected and enabled.');
            } else {
                setPermissionError(`An error occurred: ${err.message}`);
            }
        } else {
            setPermissionError('An unknown error occurred while accessing media devices.');
        }
      }
    };

    // Only get permissions if we don't have a stream yet
    if (!stream) {
      getMediaPermissions();
    }

    return () => {
      // Use the ref to access the current stream value
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Clean up audio context resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []); // Only run once on mount

  // Handle connection attempt with scenario
  const handleConnect = async () => {
    try {
      setError(null);
      setHasAttemptedConnection(true);
      await connect(selectedScenario?.id);
      // Start the timer when connection is successful
      setIsTimerPaused(false);
      // Initialize activity time when connection starts
      setLastActivityTime(Date.now());
    } catch (err) {
      setError('Failed to connect to server. Please try again.');
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    try {
      // Stop any ongoing recording
      if (isRecording) {
        stopRecording();
      }
      
      // Stop any playing audio
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      
      // Stop all media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      setStream(null);
      
      // Clear any silence timer
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }
      
      // Disconnect from WebSocket
      disconnect();
      
      // Reset state
      setHasAttemptedConnection(false);
      setCurrentAudioUrl(null);
      setError(null);
      setIsProcessing(false);
      
      // Stop the timer
      setIsTimerPaused(true);
      
      // If we have conversation chunks, show the analysis button
      if (conversationChunks.length > 0) {
        endCall();
      }
      
      // Force a re-render to clear the connection status message
      setTimeout(() => {
        setError(null);
      }, 100);
    } catch (error) {
      setError('Failed to disconnect properly. Please refresh the page.');
    }
  };
  
  const toggleMute = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const newMutedState = !isMuted;
        audioTracks.forEach(track => {
          track.enabled = !newMutedState;
        });
        setIsMuted(newMutedState);
        localStorage.setItem('isMuted', JSON.stringify(newMutedState));
      }
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const newCameraState = !isCameraOn;
        videoTracks.forEach(track => {
          track.enabled = newCameraState;
        });
        setIsCameraOn(newCameraState);
        localStorage.setItem('isCameraOn', JSON.stringify(newCameraState));
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
        streamRef.current = mediaStream;
      }
      
      // Create a new MediaRecorder with the current stream
      if (stream) {
        // Define codec options for different browsers
        const codecOptions = [
          // WebM with VP8 and Opus (Chrome, Firefox)
          {
            mimeType: 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: 1000000,
            audioBitsPerSecond: 128000,
            videoSize: { width: 640, height: 480 },
            frameRate: 15
          },
          // WebM with H.264 and Opus (Edge)
          {
            mimeType: 'video/webm;codecs=h264,opus',
            videoBitsPerSecond: 1000000,
            audioBitsPerSecond: 128000,
            videoSize: { width: 640, height: 480 },
            frameRate: 15
          },
          // MP4 with H.264 and AAC (Safari)
          {
            mimeType: 'video/mp4;codecs=h264,aac',
            videoBitsPerSecond: 1000000,
            audioBitsPerSecond: 128000,
            videoSize: { width: 640, height: 480 },
            frameRate: 15
          }
        ];

        // Find the first supported codec
        let selectedOptions = null;
        for (const options of codecOptions) {
          if (MediaRecorder.isTypeSupported(options.mimeType)) {
            selectedOptions = options;
            break;
          }
        }

        // If no specific codec is supported, use default
        if (!selectedOptions) {
          console.warn('No specific codec supported, falling back to default');
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
        } else {
          console.log('Using codec:', selectedOptions.mimeType);
          const mediaRecorder = new MediaRecorder(stream, selectedOptions);
          mediaRecorderRef.current = mediaRecorder;
        }
          
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
      lastMessageTimestamp.current = Date.now();
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

  const endCall = useCallback(() => {
    try {
      // Stop any ongoing recording
      if (isRecording) {
        stopRecording();
      }
      
      // Stop any playing audio
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      
      // Stop all media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setStream(null);
      
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
      
      // Only disconnect if we're connected
      if (state.isConnected) {
        disconnect();
      }
      
      // Reset state
      setHasAttemptedConnection(false);
      setCurrentAudioUrl(null);
      setError(null);
      setIsProcessing(false);
      
      // Stop the timer
      setIsTimerPaused(true);
      
      // Always show the analysis button after all state is reset
      setShowAnalysisButton(true);
      setHasConversationEnded(true); // Set conversation as ended
      
    } catch (error) {
      console.error('Error during call end:', error);
      setError('Failed to end call properly. Please refresh the page.');
    }
  }, [state.isConnected, isRecording, stream, silenceTimer, disconnect]);

  // Update the getBubbleSize function
  const getBubbleSize = () => {
    const baseSize = 9.5;
    const maxScale = 1.25; // Slightly increased from 1.2 to 1.25 for more visible feedback
    const scale = isSpeaking && !isPlaying ? 1 + (smoothedAudioLevel * (maxScale - 1)) : 1;
    return {
      transform: `scale(${scale})`,
      width: `${baseSize}rem`,
      height: `${baseSize}rem`,
    };
  };
  
  const toggleUserCameraView = () => {
    if (isCameraOn) {
      setShowUserCamera(prev => !prev);
    }
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
      
      // Set processing to false before ending the call
      setIsProcessing(false);
      
      // Show the analysis button after sending the full conversation
      endCall();
      
    } catch (err) {
      console.error('Error sending full conversation:', err);
      setError('Failed to send full conversation to server. Please try again.');
      setIsProcessing(false);
    }
  };

  // Navigate to analysis page with the full conversation video
  const navigateToAnalysis = () => {
    if (conversationChunks.length > 0) {
      try {
        // Filter out any empty chunks and verify we have valid data
        const validChunks = conversationChunks.filter(chunk => chunk.size > 0);
        
        if (validChunks.length === 0) {
          setError('No valid conversation data recorded. Please try recording again.');
          return;
        }

        // Create a single blob from all chunks with explicit MIME type and codecs
        const finalBlob = new Blob(validChunks, { 
          type: 'video/webm;codecs=vp8,opus'
        });

        // Verify the blob has actual content
        if (finalBlob.size === 0) {
          setError('Failed to create conversation recording. Please try recording again.');
          return;
        }
        
        // Navigate to analysis with the combined video
        navigate(`/practice/analysis/${moduleId}`, {
          state: {
            videoBlob: finalBlob,
            moduleId: moduleId,
            scenarioId: selectedScenario?.id,
            duration: conversationDuration // Add duration for verification
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
        if (event.data && event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // Add to conversation chunks for later analysis
        if (videoChunksRef.current.length > 0) {
          // Filter out any empty chunks
          const validChunks = videoChunksRef.current.filter(chunk => chunk.size > 0);
          
          if (validChunks.length > 0) {
            setConversationChunks(prevChunks => [...prevChunks, ...validChunks]);
            
            // Only send the current chunk to the server if we're still connected
            if (state.isConnected) {
              const videoBlob = new Blob(validChunks, { 
                type: 'video/webm;codecs=vp8,opus'
              });
              
              if (videoBlob.size > 0) {
                await sendVideoToServer(videoBlob);
              }
            }
          }
        }
      };
    }
  }, [mediaRecorderRef.current, state.isConnected]);

  // Add a useEffect to log when showAnalysisButton changes
  useEffect(() => {
    // Removed debug logging
  }, [showAnalysisButton]);

  // Register callback for automatic call ending
  useEffect(() => {
    const cleanup = onEndCall(endCall);
    return cleanup;
  }, [onEndCall]); // Only depend on onEndCall since it's stable

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header Section */}
      <div className="bg-[#235390]">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => navigate('/home')}
                className="flex items-center space-x-2 text-white hover:text-gray-100 transition-colors text-sm sm:text-base flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Home</span>
              </button>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white text-center flex-1 mx-2">
              {selectedScenario?.title || 'Conversation Practice'}
            </h1>
            <div className="w-8 sm:w-24"></div> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className={`p-4 sm:p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h2 className={`text-lg sm:text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {selectedScenario?.title || 'Scenario Description'}
          </h2>
          <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            {selectedScenario?.description}
          </p>
          <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            <h3 className={`text-base sm:text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Initial Prompt</h3>
            <p className="text-sm sm:text-base mb-4 whitespace-pre-line">{String(selectedScenario?.initial_prompt || '')}</p>
          </div>
          <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Difficulty: {selectedScenario?.difficulty_level || 'Not specified'}
          </div>
        </div>

        {/* Main Content */}
        <div className={`mt-4 sm:mt-6 p-4 sm:p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          {/* Connection status */}
          {state.error && (
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
              <AlertCircle className="inline-block mr-2" size={16} />
              {state.error}
            </div>
          )}

          {/* Main content area */}
          <main className="flex-1 p-2 sm:p-4 flex items-center justify-center">
            <div className={`w-full max-w-4xl mx-auto rounded-2xl overflow-hidden ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {permissionError ? (
                <div className="p-8 text-center">
                  <div className={`mb-4 ${isDarkMode ? 'text-red-300' : 'text-red-500'}`}>⚠️ {permissionError}</div>
                  <button 
                    onClick={() => navigate('/home')}
                    className="px-4 py-2 bg-[#4CAF50] text-white rounded-md hover:bg-[#45a049]"
                  >
                    Return to Dashboard
                  </button>
                </div>
              ) : (
                <div className="p-4 sm:p-12 flex flex-col">
                  {/* Call interface */}
                  <div className="flex flex-col sm:flex-row items-center justify-center min-h-[200px] sm:min-h-[240px] space-y-4 sm:space-y-0">
                    {/* Participant info - Left side */}
                    <div className="w-full sm:w-1/5 text-center sm:text-left">
                      <h2 className={`text-base sm:text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Time</h2>
                      <div className={`text-base sm:text-lg font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{conversationDuration}</div>
                      <div className="text-base sm:text-lg font-normal text-[#4CAF50]">Fidupia</div>
                    </div>
                    
                    {/* Avatar/Video - Center */}
                    <div className="w-full sm:w-3/5 flex justify-center">
                      <div className="relative flex items-center justify-center">
                        {!(showUserCamera && isCameraOn) ? (
                          <>
                            {/* Outer ring - appears with sound when camera is off */}
                            {!isCameraOn && (
                              <div 
                                style={{
                                  transform: `scale(${isSpeaking && !isPlaying ? 1 + (smoothedAudioLevel * 0.25) : 0.9})`,
                                  opacity: isSpeaking && !isPlaying ? 0.25 : 0.1,
                                  transition: 'transform 0.2s ease-out, opacity 0.2s ease-out', // Reduced from 0.3s to 0.2s
                                }}
                                className="absolute rounded-full bg-[#4CAF50]/20"
                              ></div>
                            )}
                            
                            {/* Middle ring - always visible but expands when camera is off */}
                            {!isCameraOn && (
                              <div 
                                style={{
                                  transform: `scale(${isSpeaking && !isPlaying ? 1 + (smoothedAudioLevel * 0.15) : 0.95})`,
                                  opacity: isSpeaking && !isPlaying ? 0.45 : 0.15,
                                  transition: 'transform 0.2s ease-out, opacity 0.2s ease-out', // Reduced from 0.3s to 0.2s
                                }}
                                className="absolute rounded-full bg-[#4CAF50]/10"
                              ></div>
                            )}
                            
                            {/* Inner content */}
                            <div 
                              style={{
                                ...getBubbleSize(),
                                transition: 'transform 0.2s ease-out', // Reduced from 0.3s to 0.2s
                              }}
                              className="relative flex items-center justify-center"
                            >
                              {/* Base circle background */}
                              <div className={`absolute inset-0 rounded-full ${
                                isSpeaking && !isPlaying ? 'bg-[#4CAF50]/65' : 'bg-[#4CAF50]/40'
                              }`} />
                              
                              {/* AudioLines icon in center */}
                              <div className="relative z-10">
                                <AudioLines size={24} className={`${isSpeaking && !isPlaying ? 'text-white' : 'text-[#4CAF50]'} opacity-60`} />
                              </div>
                            </div>
                          </>
                        ) : null}

                        {/* Video element for recording, now conditionally visible */}
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className={
                            (showUserCamera && isCameraOn)
                              ? 'w-auto h-[180px] sm:h-[240px] rounded-lg bg-black'
                              : 'hidden'
                          }
                          style={{ transform: 'scaleX(-1)' }}
                        />
                      </div>
                    </div>
                    
                    {/* Controls - Right side */}
                    <div className="w-full sm:w-1/5 flex flex-row sm:flex-col items-center sm:items-end justify-center sm:justify-start gap-4 sm:gap-4 pr-0 sm:pr-1">
                      <div 
                        className="relative flex items-center justify-center sm:justify-end h-12 sm:h-14"
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                      >
                        <button
                          onClick={toggleUserCameraView}
                          disabled={!isCameraOn}
                          className={`absolute top-0 right-0 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full text-white transition-all duration-300 ease-in-out transform ${
                            isHovering
                              ? 'opacity-100 -translate-x-16 sm:-translate-x-20'
                              : 'opacity-0 translate-x-0'
                          } ${!isCameraOn ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                          aria-label={showUserCamera ? "Audio Visualization" : "User View"}
                          tabIndex={isHovering ? 0 : -1}
                        >
                          {showUserCamera ? <AudioLines size={20} className="sm:w-6 sm:h-6" /> : <User size={20} className="sm:w-6 sm:h-6" />}
                        </button>
                        <button
                          onClick={toggleCamera}
                          disabled={state.isConnected}
                          className={`relative z-10 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-colors ${
                            state.isConnected
                              ? `${isDarkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`
                              : isCameraOn
                                ? `${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`
                                : `${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`
                          }`}
                          aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
                        >
                          {isCameraOn ? <Camera size={20} className="sm:w-6 sm:h-6" /> : <CameraOff size={20} className="sm:w-6 sm:h-6" />}
                        </button>
                      </div>
                      
                      <button
                        onClick={toggleMute}
                        disabled={state.isConnected}
                        className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full ${
                          state.isConnected
                            ? `${isDarkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`
                            : isMuted
                              ? `${isDarkMode ? 'text-gray-300 dark:bg-transparent' : 'bg-gray-200 text-gray-700'}`
                              : `${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`
                        }`}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                      >
                        <Mic size={20} className={`${isMuted ? 'hidden' : 'block'} sm:w-6 sm:h-6`} />
                        <MicOff size={20} className={`${isMuted ? 'block' : 'hidden'} sm:w-6 sm:h-6`} />
                      </button>

                      <button
                        onClick={state.isConnected ? handleDisconnect : handleConnect}
                        disabled={state.isConnecting || (!state.isConnected && !areMediaDevicesReady()) || hasConversationEnded}
                        className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full ${
                          state.isConnected
                            ? 'bg-red-500 text-white hover:bg-red-600' // Red for disconnect
                            : (hasConversationEnded || state.isConnecting || !areMediaDevicesReady()) // Updated condition
                              ? `${isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'} cursor-not-allowed` // Gray for disabled states
                              : 'bg-[#4CAF50] text-white hover:bg-[#45a049]' // Green for connect
                        }`}
                        aria-label={
                          state.isConnected
                            ? "Disconnect"
                            : state.isConnecting
                              ? "Connecting..."
                              : "Connect to server"
                        }
                      >
                        {state.isConnected ? (
                          <PhoneOff size={20} className="sm:w-6 sm:h-6" />
                        ) : state.isConnecting ? (
                          <div className="animate-spin">
                            <Wifi size={20} className="sm:w-6 sm:h-6" />
                          </div>
                        ) : (
                          <Play size={20} className="sm:w-6 sm:h-6" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Messages area */}
                  <div className="mt-4 sm:mt-8 flex-1 overflow-y-auto p-2 sm:p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-8`}>
                        {state.isConnected ? (
                          <p>Start a conversation by speaking.</p>
                        ) : (
                          <p>Connect to the server to start a conversation.</p>
                        )}
                      </div>
                    ) : (
                      <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-8`}>
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
                  <div className={`mt-4 p-2 sm:p-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-center space-x-2 sm:space-x-4">
                      {state.isConnected && (
                        <div className="flex flex-col items-center">
                          <div className="text-xs sm:text-sm text-[#4CAF50] mb-2">
                            {isPlaying
                              ? "Assistant is speaking..."
                              : isRecording
                                ? "Recording in progress..."
                                : "Conversation in progress..."}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Media device status */}
                    {!areMediaDevicesReady() && !hasConversationEnded && (
                      <div className={`mt-2 text-center text-xs sm:text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`}>
                        <p>Please enable both microphone and camera before connecting.</p>
                      </div>
                    )}
                    
                    {/* Processing indicator */}
                    {isProcessing && (
                      <div className={`mt-2 text-center text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <p>{isConversationComplete ? "Processing full conversation..." : "Processing your video..."}</p>
                      </div>
                    )}
                    
                    {/* Message sent indicator */}
                    {error && error.includes("Message sent") && (
                      <div className="mt-2 text-center text-xs sm:text-sm text-[#4CAF50]">
                        <p>{error}</p>
                      </div>
                    )}
                    
                    {/* Connection status */}
                    {!state.isConnected && hasAttemptedConnection && (
                      <div className={`mt-2 text-center text-xs sm:text-sm ${isDarkMode ? 'text-red-300' : 'text-red-500'}`}>
                        <p>Not connected to server. Please try connecting again.</p>
                      </div>
                    )}

                    {/* Analysis button and Start New Conversation button - only show after ending the call */}
                    {hasConversationEnded && conversationChunks.length > 0 && !isRecording && !isProcessing && parseDurationToSeconds(conversationDuration) > 15 && (
                      <div className="mt-4 flex flex-col items-center space-y-2 sm:space-y-2.5"> {/* Container for both buttons, increased spacing */}
                        <button
                          onClick={navigateToAnalysis}
                          className="w-full sm:w-56 px-3 sm:px-4 py-2 bg-[#4CAF50] text-white rounded-md hover:bg-[#45a049] flex items-center justify-center text-sm sm:text-base" // Added w-56 and justify-center
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                          </svg>
                          Analyze Conversation
                        </button>
                        <button
                          onClick={() => window.location.reload()}
                          className="w-full sm:w-56 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center text-sm sm:text-base" // Added w-56 and justify-center, removed mt-2
                        >
                          <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          New Conversation
                        </button>
                      </div>
                    )}
                    {/* Show only New Conversation button if duration is <= 15 seconds */}
                    {hasConversationEnded && (parseDurationToSeconds(conversationDuration) <= 15 || conversationChunks.length === 0) && !isRecording && !isProcessing && (
                      <div className="mt-4 flex flex-col items-center space-y-2 sm:space-y-2.5">
                        <button
                          onClick={() => window.location.reload()}
                          className="w-full sm:w-56 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center text-sm sm:text-base"
                        >
                          <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          New Conversation
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
          
          {/* Footer with module info */}
          <footer className={`p-2 sm:p-4 ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'} text-center text-xs sm:text-sm`}>
            {selectedScenario ? selectedScenario.title : 'Conversation Practice'} session
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ConversationPractice;