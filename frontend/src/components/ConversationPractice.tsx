import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, PhoneOff, Camera, CameraOff, Globe2, ArrowLeft, Play, Pause } from 'lucide-react';

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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [conversationDuration, setConversationDuration] = useState<string>("00:00");
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isIconHovered, setIsIconHovered] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const moduleTitle = moduleId ? moduleTitles[moduleId] || 'Practice' : 'Practice';

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

  // Set up audio visualization
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
        source.disconnect();
      };
    } else {
      // If stream is unavailable or muted, reset speaking state
      setIsSpeaking(false);
      setAudioLevel(0);
    }
  }, [stream, isMuted]);

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

  const endCall = () => {
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
    
    // Navigate back to dashboard
    navigate('/home');
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
        <h1 className="ml-3 text-2xl font-medium text-gray-800 dark:text-gray-100">{moduleTitle}</h1>
      </header>

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
                    {isCameraOn ? (
                      <div className="w-[21.84rem] h-[16.8rem] rounded-lg overflow-hidden bg-black shadow-md">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
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
                    )}
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
                    onClick={toggleTimer}
                    className={`flex items-center justify-center w-14 h-14 rounded-full ${isTimerPaused 
                      ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                    aria-label={isTimerPaused ? "Resume timer" : "Pause timer"}
                  >
                    {isTimerPaused ? <Play size={25} /> : <Pause size={25} />}
                  </button>
                  
                  <button
                    onClick={endCall}
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500 text-white hover:bg-red-600"
                    aria-label="End call"
                  >
                    <PhoneOff size={25} />
                  </button>
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
  );
};

export default ConversationPractice;