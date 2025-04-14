import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { analyzeSpeech, analyzeVisual, generateSpeechFeedback, generateVisualFeedback, getSpeechFeedback, getVisualFeedback, getSpeechSession, getVisualSession } from '../utils/analysisService';
import { useTheme } from '../context/ThemeContext';

interface LocationState {
  videoBlob: Blob;
  moduleId: string;
  scenarioId?: string;
}

interface SpeechFeedback {
  id: string;
  session_id: string;
  feedback_text: string;
  transcript: string;
  overall_score: number;
  fluency_score: number;
  confidence_score: number;
  clarity_score: number;
  content_score: number;
  pace_score: number;
  volume_score: number;
  pause_score: number;
  created_at: string;
  updated_at: string;
}

interface VisualFeedback {
  id: string;
  session_id: string;
  feedback_text: string;
  overall_score: number;
  eye_contact_score: number;
  smile_score: number;
  posture_score: number;
  expression_score: number;
  visibility_score: number;
  created_at: string;
  updated_at: string;
}

const ConversationAnalysis: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const videoBlob = location.state?.videoBlob;
  const moduleId = location.state?.moduleId;
  const scenarioId = location.state?.scenarioId;
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [feedbackRequested, setFeedbackRequested] = useState(false);
  const [allFeedbackReady, setAllFeedbackReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<SpeechFeedback>({
    id: '',
    session_id: '',
    feedback_text: '',
    transcript: '',
    overall_score: 0,
    fluency_score: 0,
    confidence_score: 0,
    clarity_score: 0,
    content_score: 0,
    pace_score: 0,
    volume_score: 0,
    pause_score: 0,
    created_at: '',
    updated_at: ''
  });
  const [visualFeedback, setVisualFeedback] = useState<VisualFeedback>({
    id: '',
    session_id: '',
    feedback_text: '',
    overall_score: 0,
    eye_contact_score: 0,
    smile_score: 0,
    posture_score: 0,
    expression_score: 0,
    visibility_score: 0,
    created_at: '',
    updated_at: ''
  });
  const { isDarkMode } = useTheme();

  // Cleanup function to prevent state updates after unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!videoBlob) {
      setError('No video data found. Please record a conversation first.');
      setLoading(false);
      return;
    }

    const analyzeVideo = async () => {
      if (!videoBlob || !isMounted.current || analysisStarted) return;
      
      setAnalysisStarted(true);
      setLoading(true);
      setError(null);
      
      try {
        // Step 1: Analyze speech with scenario ID
        setCurrentStep('Analyzing speech...');
        const formData = new FormData();
        formData.append('file', videoBlob);
        if (scenarioId) {
          formData.append('scenario_id', scenarioId);
        }
        const speechSession = await analyzeSpeech(videoBlob, scenarioId);
        if (!isMounted.current) return;
        setSessionId(speechSession.id);
        
        // Step 2: Analyze visual using the same session ID
        setCurrentStep('Analyzing visual elements...');
        const visualSession = await analyzeVisual(videoBlob, speechSession.id);
        if (!isMounted.current) return;
        
        // Wait for visual session to be available
        setCurrentStep('Processing visual analysis...');
        let visualSessionData;
        let retryCount = 0;
        const maxRetries = 10;
        const retryDelay = 3000;
        
        while (retryCount < maxRetries) {
          try {
            visualSessionData = await getVisualSession(speechSession.id);
            if (visualSessionData) break;
          } catch (error) {
            console.log(`Visual session not ready yet, retry ${retryCount + 1}/${maxRetries}...`);
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        }
        
        if (!visualSessionData) {
          throw new Error('Failed to get visual session data after multiple retries');
        }
        
        setCurrentStep('Analysis complete! Waiting for feedback...');
        
        // Step 3: Generate and get speech feedback
        if (!isMounted.current) return;
        setCurrentStep('Generating speech feedback...');
        await generateSpeechFeedback(speechSession.id);
        
        // Wait for speech feedback to be available
        let speechFeedbackResult;
        retryCount = 0;
        
        while (retryCount < maxRetries) {
          try {
            speechFeedbackResult = await getSpeechFeedback(speechSession.id);
            if (speechFeedbackResult) break;
          } catch (error) {
            console.log('Speech feedback not ready yet, retrying...');
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (!speechFeedbackResult) {
          throw new Error('Failed to get speech feedback after multiple retries');
        }
        
        if (!isMounted.current) return;
        setSpeechFeedback(speechFeedbackResult);
        
        setCurrentStep('Analysis complete!');
        setAnalysisComplete(true);
        // Don't set loading to false here - it will be set when visual feedback is ready
      } catch (error) {
        console.error('Error during analysis:', error);
        if (!isMounted.current) return;
        setError('An error occurred during analysis. Please try again.');
        setLoading(false);
      }
    };

    analyzeVideo();
  }, [videoBlob, analysisStarted, scenarioId]);

  // Separate effect for generating visual feedback
  useEffect(() => {
    const generateVisualFeedbackIfNeeded = async () => {
      if (!sessionId || !isMounted.current || feedbackRequested || !analysisComplete) return;
      
      setFeedbackRequested(true);
      setCurrentStep('Generating visual feedback...');
      
      try {
        // Generate visual feedback
        console.log('Attempting to generate visual feedback for session:', sessionId);
        await generateVisualFeedback(sessionId);
        
        // Wait for visual feedback to be available
        let visualFeedbackResult;
        let retryCount = 0;
        const maxRetries = 5;
        
        while (retryCount < maxRetries) {
          try {
            visualFeedbackResult = await getVisualFeedback(sessionId);
            if (visualFeedbackResult) break;
          } catch (error) {
            console.log('Visual feedback not ready yet, retrying...');
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (!visualFeedbackResult) {
          throw new Error('Failed to get visual feedback after multiple retries');
        }
        
        if (!isMounted.current) return;
        setVisualFeedback(visualFeedbackResult);
        
        // Set all feedback as ready
        setAllFeedbackReady(true);
        setLoading(false);
      } catch (visualFeedbackError) {
        console.error('Visual feedback error:', visualFeedbackError);
        setError('Speech analysis completed successfully, but visual feedback generation failed. This may affect the completeness of your feedback.');
        // Even if there's an error, we should still show the speech feedback
        setAllFeedbackReady(true);
        setLoading(false);
      }
    };

    generateVisualFeedbackIfNeeded();
  }, [sessionId, feedbackRequested, analysisComplete]);

  // Add effect to log feedback data when it changes
  useEffect(() => {
    if (allFeedbackReady) {
      console.log('All feedback is ready:', {
        speechFeedback,
        visualFeedback
      });
    }
  }, [allFeedbackReady, speechFeedback, visualFeedback]);

  // Only show results when everything is ready
  const showResults = allFeedbackReady && analysisComplete;

  const handleBackToPractice = () => {
    navigate(`/practice/${moduleId}`);
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Header Section */}
        <div className="bg-[#235390]">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToHome}
                  className="flex items-center space-x-2 text-white hover:text-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to Home</span>
                </button>
              </div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>
                Conversation Analysis
              </h1>
              <div className="w-24"></div> {/* Spacer for alignment */}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
            <div className="flex items-center">
              <XCircle className="mr-2" size={20} />
              <span>{error}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header Section */}
      <div className="bg-[#235390]">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToHome}
                className="flex items-center space-x-2 text-white hover:text-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Home</span>
              </button>
            </div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>
              Conversation Analysis
            </h1>
            <div className="w-24"></div> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CAF50]"></div>
            <p className="ml-4 text-gray-600">{currentStep}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {showResults && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Speech Analysis Results */}
                <div className={`p-6 rounded-xl ${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                }`}>
                  <h2 className={`text-xl font-semibold mb-4 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    Speech Analysis
                  </h2>
                  {speechFeedback ? (
                    <div>
                      <div className="mb-4">
                        <h3 className={`font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          Feedback
                        </h3>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                          {speechFeedback.feedback_text}
                        </p>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className={`font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          Individual Scores
                        </h3>
                        <div className="space-y-2 mt-2">
                          <div>
                            <div className="flex justify-between">
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Fluency
                              </span>
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                {speechFeedback.fluency_score.toFixed(1)}/5
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(speechFeedback.fluency_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Confidence
                              </span>
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                {speechFeedback.confidence_score.toFixed(1)}/5
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(speechFeedback.confidence_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Clarity
                              </span>
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                {speechFeedback.clarity_score.toFixed(1)}/5
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(speechFeedback.clarity_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Content
                              </span>
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                {speechFeedback.content_score.toFixed(1)}/5
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(speechFeedback.content_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Pace
                              </span>
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                {speechFeedback.pace_score.toFixed(1)}/5
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(speechFeedback.pace_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Volume
                              </span>
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                {speechFeedback.volume_score.toFixed(1)}/5
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(speechFeedback.volume_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                Pause
                              </span>
                              <span className={`text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                {speechFeedback.pause_score.toFixed(1)}/5
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(speechFeedback.pause_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className={`font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-800'
                        }`}>
                          Overall Score
                        </h3>
                        <div className="mt-1 flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-[#4CAF50] h-2.5 rounded-full"
                              style={{ width: `${(speechFeedback.overall_score / 5) * 100}%` }}
                            ></div>
                          </div>
                          <span className={`ml-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {speechFeedback.overall_score.toFixed(1)}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No speech feedback available.</p>
                  )}
                </div>

                {/* Visual Analysis Results */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <CheckCircle className="mr-2 text-[#4CAF50]" size={20} />
                    Visual Analysis
                  </h2>
                  {visualFeedback ? (
                    <div>
                      <div className="mb-4">
                        <h3 className="font-medium text-gray-700">Feedback</h3>
                        <p className="text-gray-600 mt-1">{visualFeedback.feedback_text}</p>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className="font-medium text-gray-700">Individual Scores</h3>
                        <div className="space-y-2 mt-2">
                          <div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Eye Contact</span>
                              <span className="text-sm text-gray-600">{visualFeedback.eye_contact_score.toFixed(1)}/5</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(visualFeedback.eye_contact_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Smile</span>
                              <span className="text-sm text-gray-600">{visualFeedback.smile_score.toFixed(1)}/5</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(visualFeedback.smile_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Posture</span>
                              <span className="text-sm text-gray-600">{visualFeedback.posture_score.toFixed(1)}/5</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(visualFeedback.posture_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Expression</span>
                              <span className="text-sm text-gray-600">{visualFeedback.expression_score.toFixed(1)}/5</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(visualFeedback.expression_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Visibility</span>
                              <span className="text-sm text-gray-600">{visualFeedback.visibility_score.toFixed(1)}/5</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-[#4CAF50] h-2 rounded-full" style={{ width: `${(visualFeedback.visibility_score / 5) * 100}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-700">Overall Score</h3>
                        <div className="mt-1 flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-[#4CAF50] h-2.5 rounded-full"
                              style={{ width: `${(visualFeedback.overall_score / 5) * 100}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-gray-600">{visualFeedback.overall_score.toFixed(1)}/5</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No visual feedback available.</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Practice Again Button */}
            {showResults && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleBackToPractice}
                  className="px-6 py-3 bg-[#4CAF50] text-white rounded-lg hover:bg-[#45a049] transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Practice Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationAnalysis; 