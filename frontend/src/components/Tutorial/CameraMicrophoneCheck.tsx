import React, { useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import tutorialAudio from '../../assets/tutorial/ElevenLabs_Text_to_Speech_audio.mp3';

interface CameraMicrophoneCheckProps {
  onPermissionsGranted: () => void;
  onBack?: () => void;
  onNext?: () => void;
  nextButtonText?: string;
  showNextButton?: boolean;
}

const CameraMicrophoneCheck: React.FC<CameraMicrophoneCheckProps> = ({ 
  onPermissionsGranted, 
  onBack,
  onNext, 
  nextButtonText = 'Next', 
  showNextButton = false 
}) => {
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleToggleCamera = () => {
    setIsCameraEnabled(prev => !prev);
    setStatusMessage(null); // Clear message when user interacts
  };

  const handleToggleMic = () => {
    setIsMicEnabled(prev => !prev);
    setStatusMessage(null); // Clear message when user interacts
  };

  const handleConnect = () => {
    if (isCameraEnabled && isMicEnabled) {
      setStatusMessage(null);
      setIsConnecting(true);
      const audio = new Audio(tutorialAudio);
      audio.play();
      audio.onended = () => {
        onPermissionsGranted();
        setIsConnecting(false);
      };
    } else {
      setStatusMessage("Please enable both microphone and camera before connecting.");
    }
  };
  
  const canConnect = isCameraEnabled && isMicEnabled;

  // Determine navigation justification based on button visibility
  const navJustifyClass = onBack && showNextButton ? 'justify-between' : onBack ? 'justify-start' : showNextButton ? 'justify-end' : 'justify-start';

  return (
    <div className="flex flex-col h-full w-full bg-white font-sans text-gray-800">
      {/* Main content area */}
      <div className="flex flex-col flex-1 w-full p-2 sm:p-6 md:p-8 overflow-y-auto">
        {/* Main content block (mic icon & controls) */}
        <div className="flex w-full items-center justify-center flex-1 min-h-0">
          {/* Center Panel (Mic Icon and Controls Group) */}
          <div className="flex items-center justify-center px-1 sm:px-4 relative">
            {/* New relative container for circle and buttons */}
            <div className="relative">
              {/* Green Circle Div */}
              <div className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-green-100 rounded-full flex items-center justify-center overflow-hidden shadow-lg landscape:w-12 landscape:h-12 landscape:sm:w-16 landscape:sm:h-16 landscape:md:w-20 landscape:md:h-20 landscape:lg:w-24 landscape:lg:h-24">
                {/* Always show microphone icon */}
                <svg className="w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10 text-green-500 opacity-70 landscape:w-4 landscape:h-4 landscape:sm:w-6 landscape:sm:h-6 landscape:md:w-8 landscape:md:h-8" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path>
                </svg>
              </div>

              {/* Buttons Container: positioned to the right of the circle */}
              <div className="absolute top-1/2 left-full transform -translate-y-1/2 flex flex-col items-center space-y-1 sm:space-y-3 ml-1.5 sm:ml-4 md:ml-6">
                <button
                  onClick={handleToggleCamera}
                  className={`w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400
                              bg-gray-200 hover:bg-gray-300 active:bg-gray-300
                              shadow-md hover:shadow-lg active:shadow-sm`}
                  title={isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {isCameraEnabled ? (
                    <Camera className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 text-gray-700" />
                  ) : (
                    <CameraOff className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 text-gray-700" />
                  )}
                </button>

                <button
                  onClick={handleToggleMic}
                  className={`w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400
                              bg-gray-200 hover:bg-gray-300 active:bg-gray-300
                              shadow-md hover:shadow-lg active:shadow-sm`}
                  title={isMicEnabled ? "Turn Mic Off" : "Turn Mic On"}
                >
                  {isMicEnabled ? (
                    <svg className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  ) : (
                    // Mic OFF (slashed) icon - this is the one from the image for initial state
                    <svg className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={handleConnect}
                  disabled={!canConnect || isConnecting}
                  className={`w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400
                              ${canConnect && !isConnecting ? 'bg-gray-200 hover:bg-gray-300 active:bg-gray-300' : 'bg-gray-300 cursor-not-allowed opacity-60'}
                              shadow-md hover:shadow-lg active:shadow-sm`}
                  title={isConnecting ? "Connecting..." : canConnect ? "Connect to server" : "Enable camera and microphone to connect"}
                >
                  <svg className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
              </div>
            </div>
          </div>

        {/* Status Messages */}
        <div className="w-full text-center py-2 sm:py-4 flex flex-col justify-center z-10">
          {statusMessage && <p className="text-xs text-red-500 px-2 sm:px-4">{statusMessage}</p>}
          
          {!statusMessage && canConnect && 
            <p className="text-xs text-green-600 px-2 sm:px-4"> Ready to connect! Press Play to continue.</p>
          }
          
          {!statusMessage && !canConnect && (
            <>
              <p className="text-xs text-gray-600 px-2 sm:px-4">Press the camera, microphone, and play buttons to continue.</p>
              {(!isCameraEnabled || !isMicEnabled) && ( // Show orange message if either is not enabled
                 <p className="text-xs text-orange-500 mt-1 px-2 sm:px-4">
                   Please enable both microphone and camera and press connect.
                 </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      {(onBack || showNextButton) && (
        <div className={`p-2 sm:p-4 md:p-6 flex ${navJustifyClass} items-center`}>
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 text-xs sm:text-base px-2 py-1 sm:px-3 sm:py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Back
            </button>
          )}
          {showNextButton && onNext && (
            <button
              onClick={onNext}
              className="bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-base"
            >
              {nextButtonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CameraMicrophoneCheck; 