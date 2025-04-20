import React, { useState } from 'react';
import welcomeImage from '../assets/tutorial/welcome.svg';
import scenarioSelectionImage from '../assets/tutorial/scenario-selection.png';
import practiceWithAIImage from '../assets/tutorial/practice-with-ai.png';
import detailedAnalysisImage from '../assets/tutorial/detailed-analysis.png';

interface TutorialStep {
  title: string;
  description: string;
  image: string;
}

interface NewUserTutorialProps {
  onComplete: () => void;
}

const NewUserTutorial: React.FC<NewUserTutorialProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps: TutorialStep[] = [
    {
      title: "Welcome to RealTalk!",
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
      description: "To start your practice session: 1) Turn on your microphone and camera, 2) Press the play button to begin. Speak naturally and the AI will respond in real-time. When you're finished, you can either hang up manually or wait for the conversation to end naturally. After the session, you'll be able to analyze your performance.",
      image: practiceWithAIImage
    },
    {
      title: "Get Detailed Analysis",
      description: "After each session, you'll receive comprehensive feedback on both your visual and speech performance. The AI analyzes your body language, eye contact, and posture, while also evaluating your speech clarity, tone, and content. You'll get specific scores and actionable insights to help you improve. You get 5 free requests to try out the service!",
      image: detailedAnalysisImage
    }
  ];

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-12 max-w-6xl w-full mx-4 relative">
        {/* Skip Tutorial button */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 text-xl"
        >
          Skip Tutorial
        </button>

        {/* Progress dots */}
        <div className="flex justify-center space-x-3 mb-10">
          {tutorialSteps.map((_, index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full ${
                index === currentStep ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-8">
            {tutorialSteps[currentStep].title}
          </h2>
          <p className="text-gray-600 mb-10 text-xl">
            {tutorialSteps[currentStep].description}
          </p>
          
          {/* Image display */}
          <div className="mb-10">
            <img 
              src={tutorialSteps[currentStep].image} 
              alt={tutorialSteps[currentStep].title}
              className="w-full max-h-[600px] object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-10">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="bg-green-500 text-white px-10 py-4 rounded-lg hover:bg-green-600 transition-colors text-xl"
          >
            {currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewUserTutorial; 