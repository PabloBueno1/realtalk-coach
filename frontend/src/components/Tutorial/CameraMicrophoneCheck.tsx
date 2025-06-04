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
      <div className="flex flex-col flex-1 w-full p-4 sm:p-8 md:p-10 overflow-y-auto">
        {/* Status Messages - MOVED TO BOTTOM OF THIS CONTAINER */}
        {/* Removed from here */}
        
        {/* Main content block (mic icon & controls) */}
        <div className="flex w-full items-start">  {/* Removed flex-1 */}
          {/* Left Panel (empty as per image) */}
          <div className="flex flex-col justify-start items-start space-y-1 pr-4 sm:pr-6 md:pr-8 py-4">
            {/* Content removed as per new UI */}
          </div>

          {/* Center Panel (Mic Icon and Controls Group) */}
          <div className="flex-grow flex items-center justify-center px-2 sm:px-4">
            {/* New relative container for circle and buttons */}
            <div className="relative">
              {/* Green Circle Div */}
              <div className="w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 lg:w-56 lg:h-56 bg-green-100 rounded-full flex items-center justify-center overflow-hidden shadow-lg -translate-y-[10%]">
                {/* Always show microphone icon */}
                <svg className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-green-500 opacity-70" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path>
                </svg>
              </div>

              {/* Buttons Container: absolutely positioned relative to the circle's container */}
              <div className="absolute top-0 left-full flex flex-col items-center space-y-3 sm:space-y-4 ml-4 sm:ml-6 md:ml-8 pt-0 pb-4">
                <button
                  onClick={handleToggleCamera}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400
                              bg-gray-200 hover:bg-gray-300 active:bg-gray-300
                              shadow-md hover:shadow-lg active:shadow-sm`}
                  title={isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {isCameraEnabled ? (
                    <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
                  ) : (
                    <CameraOff className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
                  )}
                </button>

                <button
                  onClick={handleToggleMic}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400
                              bg-gray-200 hover:bg-gray-300 active:bg-gray-300
                              shadow-md hover:shadow-lg active:shadow-sm`}
                  title={isMicEnabled ? "Turn Mic Off" : "Turn Mic On"}
                >
                  {isMicEnabled ? (
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  ) : (
                    // Mic OFF (slashed) icon - this is the one from the image for initial state
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={handleConnect}
                  disabled={!canConnect || isConnecting}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400
                              ${canConnect && !isConnecting ? 'bg-gray-200 hover:bg-gray-300 active:bg-gray-300' : 'bg-gray-300 cursor-not-allowed opacity-60'}
                              shadow-md hover:shadow-lg active:shadow-sm`}
                  title={isConnecting ? "Connecting..." : canConnect ? "Connect to server" : "Enable camera and microphone to connect"}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel (Controls) - This div is removed by the edit */}
        </div> {/* End of the main content block (mic icon & controls) */}

        {/* Status Messages - NEW LOCATION */}
        <div className="w-full text-center py-3 sm:py-4 flex flex-col justify-center z-10 min-h-20"> {/* Added z-10 and min-h-20 */}
          {statusMessage && <p className="text-sm sm:text-base text-red-500 px-4">{statusMessage}</p>}
          
          {!statusMessage && canConnect && 
            <p className="text-sm sm:text-base text-green-600 px-4"> Ready to connect! Press Play to continue.</p>
          }
          
          {!statusMessage && !canConnect && (
            <>
              <p className="text-sm sm:text-base text-gray-600 px-4">Press the camera, microphone, and play buttons to continue.</p>
              {(!isCameraEnabled || !isMicEnabled) && ( // Show orange message if either is not enabled
                 <p className="text-xs sm:text-sm text-orange-500 mt-1 px-4">
                   Please enable both microphone and camera and press connect.
                 </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      {(onBack || showNextButton) && (
        <div className={`p-3 sm:p-4 md:p-6 flex ${navJustifyClass}`}>
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 text-sm sm:text-base"
            >
              Back
            </button>
          )}
          {showNextButton && onNext && (
            <button
              onClick={onNext}
              className="bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors px-4 py-1 text-xs sm:px-6 sm:py-2 sm:text-sm md:px-8 md:py-3 md:text-base"
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