import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import welcomeImage from '../assets/logo/logo.svg';
import scenarioSelectionImage from '../assets/tutorial/scenario-selection.png';
// import practiceWithAIImage from '../assets/tutorial/practice-with-ai.png'; // No longer needed for this step directly
import detailedAnalysisImage from '../assets/tutorial/detailed-analysis.png';
import CameraMicrophoneCheck from './CameraMicrophoneCheck'; // Import the new component

interface TutorialStep {
  title: string;
  description: string;
  image?: string;
  interactive?: boolean;
}

interface NewUserTutorialProps {
  onComplete: () => void;
}

const NewUserTutorial: React.FC<NewUserTutorialProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [arePermissionsGrantedForInteractiveStep, setArePermissionsGrantedForInteractiveStep] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Check for session
  useEffect(() => {
    if (!session) {
      navigate('/login');
    }
  }, [session, navigate]);

  // Reset permissions granted state when step changes
  useEffect(() => {
    setArePermissionsGrantedForInteractiveStep(false);
  }, [currentStep]);

  // Track window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tutorialSteps: TutorialStep[] = [
    {
      title: "Welcome to Fidupia!",
      description: "Let's take a quick tour of how to get the most out of your practice sessions.",
      image: welcomeImage
    },
    {
      title: "Choose Your Scenario",
      description: "Select from various real-world scenarios like job interviews, networking events, or public speaking.",
      image: scenarioSelectionImage
    },
    {
      title: "Practice with AI",
      description: "To begin the conversation, enable your camera and microphone then press play. Ensure you are in a quiet and well-lit environment for the best results.",
      interactive: true
    },
    {
      title: "Get Detailed Analysis",
      description: "Get detailed AI feedback after each session. We analyze your body language, speech clarity, and content with specific scores and actionable tips for improvement. Try our service with up to 5 free requests!",
      image: detailedAnalysisImage
    }
  ];

  // Determine screen size
  const isSmallScreen = windowSize.width < 640;
  const isMediumScreen = windowSize.width >= 640 && windowSize.width < 1024;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePermissionsGranted = () => {
    setArePermissionsGrantedForInteractiveStep(true);
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Calculate max height for image based on screen size
  const getImageHeight = () => {
    // Allocate percentage of screen height for the image
    // Smaller screens need smaller images to ensure text fits
    if (isSmallScreen) {
      return windowSize.height * 0.35; // 35% of screen height
    } else if (isMediumScreen) {
      return windowSize.height * 0.45; // 45% of screen height
    } else {
      return windowSize.height * 0.5; // 50% of screen height
    }
  };

  // Get description text size based on length and screen size
  const getDescriptionClass = () => {
    const description = tutorialSteps[currentStep].description;
    const isLongDescription = description.length > 150;
    
    if (isSmallScreen) {
      return isLongDescription ? 'text-xs' : 'text-sm';
    } else if (isMediumScreen) {
      return isLongDescription ? 'text-sm' : 'text-base';
    } else {
      return isLongDescription ? 'text-base' : 'text-lg';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div 
        className="bg-white w-full h-full flex flex-col"
      >
        {/* Tutorial content container - prevents scrolling */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top section with skip button and progress */}
          <div className="p-2 sm:p-4">
            {/* Skip Tutorial button */}
            <button
              onClick={handleSkip}
              className="absolute top-2 right-3 sm:top-4 sm:right-5 text-gray-500 hover:text-gray-700 text-sm sm:text-base"
            >
              Skip Tutorial
            </button>

            {/* Progress dots */}
            <div className="flex justify-center space-x-2 sm:space-x-3 my-2 sm:my-3">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                    index === currentStep ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Middle section with title, description and image */}
          <div className="flex-1 flex flex-col justify-center items-center px-3 sm:px-6 md:px-8">
            <h2 className={`font-bold text-gray-800 mb-2 sm:mb-3 md:mb-4 text-center
              ${isSmallScreen ? 'text-xl' : isMediumScreen ? 'text-2xl' : 'text-3xl'}`}>
              {tutorialSteps[currentStep].title}
            </h2>
            
            <p className={`text-gray-600 mb-3 sm:mb-4 md:mb-5 text-center max-w-3xl ${getDescriptionClass()}`}>
              {tutorialSteps[currentStep].description}
            </p>
            
            {/* Image container or Interactive component - no shadow or border for any image */}
            <div className="flex items-center justify-center flex-1 w-full">
              {tutorialSteps[currentStep].interactive ? (
                <CameraMicrophoneCheck 
                  onPermissionsGranted={handlePermissionsGranted} 
                  onBack={handleBack}
                  onNext={handleNext}
                  nextButtonText={currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
                  showNextButton={arePermissionsGrantedForInteractiveStep}
                />
              ) : tutorialSteps[currentStep].image ? (
                <img 
                  src={tutorialSteps[currentStep].image}
                  alt={tutorialSteps[currentStep].title}
                  className="object-contain"
                  style={{ 
                    maxHeight: `${getImageHeight()}px`,
                    maxWidth: '100%'
                  }}
                />
              ) : null}
            </div>
          </div>

          {/* Bottom section with navigation buttons */}
          <div className="p-3 sm:p-4 md:p-6 flex justify-between">
            {currentStep > 0 && !tutorialSteps[currentStep].interactive ? (
              <button
                onClick={handleBack}
                className={`text-gray-500 hover:text-gray-700 \
                  ${isSmallScreen ? 'text-sm' : 'text-base'}`}
              >
                Back
              </button>
            ) : <div></div>}
            {((tutorialSteps[currentStep].interactive && arePermissionsGrantedForInteractiveStep) || !tutorialSteps[currentStep].interactive) && 
             !tutorialSteps[currentStep].interactive && (
              <button
                onClick={handleNext}
                className={`bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors
                  ${isSmallScreen ? 'px-4 py-1 text-xs' : isMediumScreen ? 'px-6 py-2 text-sm' : 'px-8 py-3 text-base'}`}
              >
                {currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUserTutorial;