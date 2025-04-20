import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import NewUserTutorial from './NewUserTutorial';
import welcomeLogo from '../assets/logo/whitewelcome.svg';
import mainLogo from '../assets/logo/logo.svg';

const ProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    learningGoals: [] as string[],
    preferredScenarios: [] as string[],
    practiceFrequency: 'daily',
    notifications: true,
    avatar: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    gender: 'male'
  });

  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  // Check if user has preferences
  useEffect(() => {
    let isMounted = true;
    
    const checkPreferences = async () => {
      try {
        const token = localStorage.getItem('access_token');
        console.log('Token from localStorage:', token); // Debug log
        if (!token) {
          console.log('No token found, redirecting to login');
          navigate('/login');
          return;
        }

        // Check if setup is already complete
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.hasCompletedSetup) {
          console.log('Setup already complete, redirecting to home');
          navigate('/home');
          return;
        }

        console.log('Making request to /auth/profile/preferences with token:', token.substring(0, 10) + '...'); // Debug log
        const response = await axios.get('http://localhost:8000/auth/profile/preferences', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Response from server:', response.data); // Debug log

        // Only update state if component is still mounted
        if (isMounted) {
          // If user already has preferences, redirect to home
          if (response.data.preferences && Object.keys(response.data.preferences).length > 0) {
            // Update user data in localStorage
            userData.hasCompletedSetup = true;
            localStorage.setItem('user', JSON.stringify(userData));
            navigate('/home');
            return;
          }

          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error checking preferences:', error);
          setIsLoading(false);
        }
      }
    };

    checkPreferences();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [navigate]); // Add navigate to dependency array

  const scenarioOptions = [
    'Professional Meetings',
    'Job Interviews',
    'Casual Conversations',
    'Public Speaking',
    'Networking Events',
    'Customer Service',
    'Conflict Resolution',
    'Team Collaboration'
  ];

  const frequencies = [
    { value: 'daily', label: 'Daily Practice' },
    { value: 'weekly', label: 'Few Times a Week' },
    { value: 'monthly', label: 'Few Times a Month' }
  ];

  const learningGoalsOptions = [
    'Improve Public Speaking',
    'Enhance Interview Skills',
    'Build Confidence',
    'Develop Leadership Communication',
    'Master Professional Presentations',
    'Improve Team Communication',
    'Enhance Networking Skills',
    'Develop Conflict Resolution Skills',
    'Improve Customer Service Communication',
    'Enhance Cross-Cultural Communication'
  ];

  const handleScenarioToggle = (scenario: string) => {
    setFormData(prev => ({
      ...prev,
      preferredScenarios: prev.preferredScenarios.includes(scenario)
        ? prev.preferredScenarios.filter(s => s !== scenario)
        : [...prev.preferredScenarios, scenario]
    }));
  };

  const handleLearningGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      learningGoals: prev.learningGoals.includes(goal)
        ? prev.learningGoals.filter(g => g !== goal)
        : [...prev.learningGoals, goal]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowMessage(false);
    setMessage('');
    setIsSuccess(false);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Update preferences in the backend
      await axios.patch('http://localhost:8000/auth/profile/preferences', 
        { preferences: formData },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Update user data in localStorage to mark setup as complete
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      userData.hasCompletedSetup = true;
      localStorage.setItem('user', JSON.stringify(userData));

      setMessage('Profile updated successfully!');
      setIsSuccess(true);
      setShowMessage(true);
      
      // Show tutorial instead of navigating directly to home
      setShowTutorial(true);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error updating profile:', axiosError);
      setMessage('Error updating profile. Please try again.');
      setShowMessage(true);
    }
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    navigate('/home');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {showTutorial && <NewUserTutorial onComplete={handleTutorialComplete} />}
      {/* Left section */}
      <div className="w-1/2 bg-[#235390] flex flex-col items-center justify-between p-12 text-white relative">
        {/* Logo Section */}
        <div className="w-full flex justify-between items-center">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-1 bg-white/10 hover:bg-white/20 text-white text-sm py-2 px-4 rounded-lg transition-colors"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back</span>
          </button>
          <img src={welcomeLogo} alt="Welcome Logo" className="h-12" />
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center text-center space-y-8 max-w-md">
          <h1 className="text-4xl font-bold">Welcome to RealTalk!</h1>
          <p className="text-xl opacity-90">
            Let's set up your profile to personalize your learning experience. 
            This will help us create the perfect practice environment for you.
          </p>
          
          {/* Logo */}
          <div className="w-full aspect-square max-w-md relative">
            <img src={mainLogo} alt="RealTalk Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Bottom text */}
        <div className="text-center">
          <p className="text-sm opacity-75">
            Your preferences help us create the perfect learning environment for you
          </p>
        </div>
      </div>

      {/* Right form section */}
      <div className="w-1/2 bg-white flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-semibold mb-8 text-gray-800">Setup Your Profile</h2>
          
          {showMessage && (
            <div className={`mb-4 p-3 rounded text-sm ${
              isSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Gender Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: option.value }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.gender === option.value
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Learning Goals
              </label>
              <div className="grid grid-cols-2 gap-3">
                {learningGoalsOptions.map(goal => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => handleLearningGoalToggle(goal)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.learningGoals.includes(goal)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Scenarios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Scenarios
              </label>
              <div className="grid grid-cols-2 gap-3">
                {scenarioOptions.map(scenario => (
                  <button
                    key={scenario}
                    type="button"
                    onClick={() => handleScenarioToggle(scenario)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.preferredScenarios.includes(scenario)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {scenario}
                  </button>
                ))}
              </div>
            </div>

            {/* Practice Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How often would you like to practice?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {frequencies.map(freq => (
                  <button
                    key={freq.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, practiceFrequency: freq.value }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.practiceFrequency === freq.value
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Enable Notifications
              </label>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, notifications: !prev.notifications }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.notifications ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit"
                className="bg-green-500 text-white text-sm py-2 px-6 rounded-xl hover:bg-green-600 transition-colors"
              >
                Complete Setup
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup; 