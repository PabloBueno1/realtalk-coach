import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import { useTheme } from '../context/ThemeContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

const ProfilePreferences: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const [formData, setFormData] = useState({
    learningGoals: [] as string[],
    preferredScenarios: [] as string[],
    practiceFrequency: 'daily',
    notifications: true,
    avatar: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    gender: 'male'
  });
  const [originalData, setOriginalData] = useState({ ...formData });
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { refreshPreferences } = useUserPreferences();

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

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        if (!session) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`${API_URL}/auth/profile/preferences`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data.preferences) {
          const newData = {
            ...formData,
            ...response.data.preferences
          };
          setFormData(newData);
          setOriginalData(newData);
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error('Error fetching preferences:', axiosError);
        console.error('Error response:', axiosError.response?.data);
        console.error('Error status:', axiosError.response?.status);
        console.error('Error headers:', axiosError.response?.headers);
        if (axiosError.response?.status === 401) {
          // Clear local storage
          localStorage.removeItem('access_token');
          // Redirect to login page
          window.location.href = '/login';
        }
        setMessage('Error loading preferences. Please try again.');
        setShowMessage(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [navigate, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowMessage(false);
    setMessage('');
    setIsSuccess(false);

    try {
      if (!session) {
        navigate('/login');
        return;
      }

      const response = await axios.patch(
        `${API_URL}/auth/profile/preferences`,
        { preferences: formData },
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        setIsSuccess(true);
        setMessage('Preferences updated successfully!');
        setShowMessage(true);
        setTimeout(() => {
          setIsSuccess(false);
          setMessage('');
        }, 3000);
        await refreshPreferences();
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error updating preferences:', axiosError);
      if (axiosError.response?.status === 401) {
        // Clear local storage
        localStorage.removeItem('access_token');
        // Redirect to login page
        window.location.href = '/login';
      }
      setMessage('Error updating preferences. Please try again.');
      setShowMessage(true);
    }
  };

  const handleLearningGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      learningGoals: prev.learningGoals.includes(goal)
        ? prev.learningGoals.filter(g => g !== goal)
        : [...prev.learningGoals, goal]
    }));
  };

  const handleCancelEditing = () => {
    setFormData({ ...originalData });
    setIsEditing(false);
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header Section */}
      <div className="bg-[#235390]">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/home')}
                className="flex items-center space-x-2 text-white hover:text-gray-100 transition-colors"
              >
                <svg 
                  className="w-5 h-5" 
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
                <span>Back to Home</span>
              </button>
            </div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>
              Profile Preferences
            </h1>
            <button
              onClick={() => isEditing ? handleCancelEditing() : setIsEditing(true)}
              className="bg-white text-[#235390] px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isEditing ? 'Cancel Editing' : 'Edit Preferences'}
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {showMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            isSuccess 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Gender Selection */}
          <div className={`bg-gray-50 p-6 rounded-xl ${
            isDarkMode ? 'bg-gray-800' : ''
          }`}>
            <label className={`block text-sm font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            } mb-4`}>
              Gender
            </label>
            {isEditing ? (
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
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      formData.gender === option.value
                        ? 'bg-[#4CAF50] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className={`text-gray-600 ${
                isDarkMode ? 'text-gray-300' : ''
              }`}>
                {formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1)}
              </p>
            )}
          </div>

          {/* Learning Goals */}
          <div className={`bg-gray-50 p-6 rounded-xl ${
            isDarkMode ? 'bg-gray-800' : ''
          }`}>
            <label className={`block text-sm font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            } mb-4`}>
              Learning Goals
            </label>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                {learningGoalsOptions.map(goal => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => handleLearningGoalToggle(goal)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      formData.learningGoals.includes(goal)
                        ? 'bg-[#4CAF50] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {formData.learningGoals.length > 0 ? (
                  formData.learningGoals.map(goal => (
                    <span 
                      key={goal} 
                      className={`bg-[#4CAF50]/10 text-[#4CAF50] px-3 py-1 rounded-full text-sm ${
                        isDarkMode ? 'text-gray-300' : ''
                      }`}
                    >
                      {goal}
                    </span>
                  ))
                ) : (
                  <p className={`text-gray-500 ${
                    isDarkMode ? 'text-gray-300' : ''
                  }`}>No learning goals selected</p>
                )}
              </div>
            )}
          </div>

          {/* Preferred Scenarios */}
          <div className={`bg-gray-50 p-6 rounded-xl ${
            isDarkMode ? 'bg-gray-800' : ''
          }`}>
            <label className={`block text-sm font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            } mb-4`}>
              Preferred Scenarios
            </label>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                {scenarioOptions.map(scenario => (
                  <button
                    key={scenario}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      preferredScenarios: prev.preferredScenarios.includes(scenario)
                        ? prev.preferredScenarios.filter(s => s !== scenario)
                        : [...prev.preferredScenarios, scenario]
                    }))}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      formData.preferredScenarios.includes(scenario)
                        ? 'bg-[#4CAF50] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {scenario}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {formData.preferredScenarios.length > 0 ? (
                  formData.preferredScenarios.map(scenario => (
                    <span 
                      key={scenario} 
                      className={`bg-[#4CAF50]/10 text-[#4CAF50] px-3 py-1 rounded-full text-sm ${
                        isDarkMode ? 'text-gray-300' : ''
                      }`}
                    >
                      {scenario}
                    </span>
                  ))
                ) : (
                  <p className={`text-gray-500 ${
                    isDarkMode ? 'text-gray-300' : ''
                  }`}>No preferred scenarios selected</p>
                )}
              </div>
            )}
          </div>

          {/* Practice Frequency */}
          <div className={`bg-gray-50 p-6 rounded-xl ${
            isDarkMode ? 'bg-gray-800' : ''
          }`}>
            <label className={`block text-sm font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            } mb-4`}>
              Practice Frequency
            </label>
            {isEditing ? (
              <div className="grid grid-cols-3 gap-3">
                {frequencies.map(freq => (
                  <button
                    key={freq.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, practiceFrequency: freq.value }))}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      formData.practiceFrequency === freq.value
                        ? 'bg-[#4CAF50] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className={`text-gray-600 ${
                isDarkMode ? 'text-gray-300' : ''
              }`}>
                {frequencies.find(f => f.value === formData.practiceFrequency)?.label || 'Not specified'}
              </p>
            )}
          </div>

          {/* Notifications */}
          <div className={`bg-gray-50 p-6 rounded-xl ${
            isDarkMode ? 'bg-gray-800' : ''
          }`}>
            <div className="flex items-center justify-between">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Enable Notifications
              </label>
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, notifications: !prev.notifications }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.notifications ? 'bg-[#4CAF50]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              ) : (
                <span className={`px-3 py-1 rounded-full text-sm ${
                  formData.notifications 
                    ? 'bg-[#4CAF50]/10 text-[#4CAF50]' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {formData.notifications ? 'Enabled' : 'Disabled'}
                </span>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-[#4CAF50] text-white px-6 py-3 rounded-lg hover:bg-[#45a049] transition-colors"
              >
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProfilePreferences;