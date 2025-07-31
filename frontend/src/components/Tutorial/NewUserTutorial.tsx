import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import welcomeImage from '../../assets/logo/logo.svg';
import scenarioSelectionImage from '../../assets/tutorial/scenario-selection.png';
import practiceWithAIImage from '../../assets/tutorial/practice-with-ai.png';
import detailedAnalysisImage from '../../assets/tutorial/detailed-analysis.png';

interface TutorialStep {
  title: string;
  description: string;
  image?: string;
}

interface NewUserTutorialProps {
  onComplete: () => void;
}

const NewUserTutorial: React.FC<NewUserTutorialProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
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
      description: "Start your conversation practice with our AI coach. Simply enable your camera and microphone when prompted, then begin speaking naturally.",
      image: practiceWithAIImage
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

  const handleSkip = () => {
    onComplete();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Get description text size based on length and screen size
  const getDescriptionClass = () => {
    const description = tutorialSteps[currentStep].description;
    const isLongDescription = description.length > 150;
    
    if (isSmallScreen) {
      return isLongDescription ? 'text-xs' : 'text-xs';
    } else if (isMediumScreen) {
      return isLongDescription ? 'text-xs' : 'text-sm';
    } else {
      return isLongDescription ? 'text-sm' : 'text-base';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div 
        className="bg-white max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl p-4 sm:p-8"
      >
        {/* Tutorial content container - prevents scrolling */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Top section with skip button and progress */}
          <div className="p-2 sm:p-4 relative">
            {/* Skip Tutorial button */}
            <button
              onClick={handleSkip}
              className="absolute top-2 right-2 sm:top-4 sm:right-5 text-gray-500 hover:text-gray-700 text-xs sm:text-base z-10"
            >
              Skip Tutorial
            </button>

            {/* Progress dots */}
            <div className="flex justify-center space-x-1 sm:space-x-3 mt-1 sm:mt-3">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 sm:w-3 sm:h-3 rounded-full ${
                    index === currentStep ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Middle section with title, description and image */}
          <div className="flex-1 flex flex-col justify-center items-center px-2 sm:px-6 md:px-8 py-1 sm:py-4">
            <h2 className={`font-bold text-gray-800 mb-1 sm:mb-4 md:mb-4 text-center
              ${isSmallScreen ? 'text-sm sm:text-xl' : isMediumScreen ? 'text-xl' : 'text-2xl'}`}>
              {tutorialSteps[currentStep].title}
            </h2>
            
            <p className={`text-gray-600 mb-1 sm:mb-5 md:mb-5 text-center max-w-3xl ${getDescriptionClass()}`}>
              {tutorialSteps[currentStep].description}
            </p>
            
            {/* Image container */}
            <div className="flex items-center justify-center">
              {tutorialSteps[currentStep].image && (
                <img 
                  src={tutorialSteps[currentStep].image}
                  alt={tutorialSteps[currentStep].title}
                  className="object-contain max-w-xs max-h-60"
                />
              )}
            </div>
          </div>

          {/* Bottom section with navigation buttons */}
          <div className="p-2 sm:p-4 md:p-6 flex justify-between items-center">
            {currentStep > 0 ? (
              <button
                onClick={handleBack}
                className={`text-gray-500 hover:text-gray-700 px-2 py-1 sm:px-3 sm:py-2 rounded-lg hover:bg-gray-100 transition-colors
                  ${isSmallScreen ? 'text-xs' : 'text-base'}`}
              >
                Back
              </button>
            ) : <div></div>}
            
            <button
              onClick={handleNext}
              className={`bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors px-3 py-1 sm:px-4 sm:py-2
                ${isSmallScreen ? 'text-xs' : isMediumScreen ? 'text-base' : 'text-base'}`}
            >
              {currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUserTutorial; 