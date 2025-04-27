import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, ChevronUp, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const API_URL = process.env.REACT_APP_API_URL;

interface SpeechData {
  id: string;
  created_at: string;
  module_id: number;
  module_title: string;
  feedback_text?: string;
  score?: number;
}

interface VisualData {
  id: string;
  created_at: string;
  eye_contact_percent: number;
  smile_percent: number;
  visibility_percent: number;
  posture_percent: number;
  emotion_distribution: Record<string, number>;
  total_frames_analyzed: number;
}

interface Session {
  id: string;
  created_at: string;
  module_id: string;
  module_title: string;
  speech_data: {
    id: string;
    user_id: string;
    scenario_id: string;
    created_at: string;
    transcript?: string;
    word_count?: number;
    total_duration?: number;
    speaking_time?: number;
    speaking_rate?: number;
    average_volume_dbfs?: number;
    num_pauses?: number;
  };
  visual_data?: {
    id: string;
    user_id: string;
    scenario_id: string;
    created_at: string;
    eye_contact_percent: number;
    smile_percent: number;
    visibility_percent: number;
    posture_percent: number;
    emotion_distribution: Record<string, number>;
    total_frames_analyzed: number;
  };
  speech_score: number;
  visual_score: number;
  overall_score: number;
}

const Scores: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, [page]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/scores/combined?page=${page}&page_size=${pageSize}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });


      if (response.data && Array.isArray(response.data)) {
        setSessions(response.data);
      } else {
        console.error('Invalid response format:', response.data);
        setError('Invalid response format');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions');
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-[#4CAF50]';
    if (score >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header Section */}
      <div className="bg-[#235390]">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center space-x-2 text-white hover:text-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Home</span>
            </button>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>
              Your Scores
            </h1>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CAF50]"></div>
          </div>
        ) : error ? (
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
            {error}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-6">
            {sessions.map((session) => {
              return (
                <div
                  key={session.id}
                  className={`p-6 rounded-xl ${
                    isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`text-lg font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        {session.module_title}
                      </h3>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/analysis/${session.id}`)}
                      className="bg-[#4CAF50] text-white px-4 py-2 rounded-lg hover:bg-[#45a049] transition-colors"
                    >
                      View Analysis
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <h4 className={`text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Speech Score
                      </h4>
                      <div className={`text-2xl font-bold mt-1 ${getScoreColor(session.speech_score)}`}>
                        {session.speech_score?.toFixed(1) || '0.0'}/5
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className={`text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Visual Score
                      </h4>
                      <div className={`text-2xl font-bold mt-1 ${getScoreColor(session.visual_score)}`}>
                        {session.visual_score?.toFixed(1) || '0.0'}/5
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className={`text-sm font-medium ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Overall Score
                      </h4>
                      <div className={`text-2xl font-bold mt-1 ${getScoreColor(session.overall_score)}`}>
                        {session.overall_score?.toFixed(1) || '0.0'}/5
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            <div className="flex justify-center space-x-2 mt-6">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className={`px-4 py-2 rounded-lg ${
                  page === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#4CAF50] text-white hover:bg-[#45a049]'
                } transition-colors`}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={sessions.length < pageSize}
                className={`px-4 py-2 rounded-lg ${
                  sessions.length < pageSize
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#4CAF50] text-white hover:bg-[#45a049]'
                } transition-colors`}
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className={`p-6 rounded-xl text-center ${
            isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'
          }`}>
            <p>No sessions found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scores; 