import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

interface SpeechFeedback {
  fluency_score: number;
  confidence_score: number;
  clarity_score: number;
  content_score: number;
  pace_score: number;
  volume_score: number;
  pause_score: number;
  overall_score: number;
  feedback_text: string;
}

interface VisualFeedback {
  eye_contact_score: number;
  smile_score: number;
  posture_score: number;
  expression_score: number;
  visibility_score: number;
  overall_score: number;
  feedback_text: string;
}

interface SessionAnalysis {
  id: string;
  created_at: string;
  module_id: number;
  module_title: string;
  speech_feedback?: SpeechFeedback;
  visual_feedback?: VisualFeedback;
}

const Analysis: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const { session } = useAuth();

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        if (!session) {
          navigate('/login');
          return;
        }

        // Fetch both speech and visual analysis data
        const [speechResponse, visualResponse] = await Promise.all([
          axios.get(`${API_URL}/speech/sessions/${id}/combined`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          }),
          axios.get(`${API_URL}/visual/sessions/${id}/combined`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          })
        ]);

        // Combine the data
        const combinedAnalysis = {
          id: speechResponse.data.session.id,
          created_at: speechResponse.data.session.created_at,
          module_id: speechResponse.data.session.scenario_id || '',
          module_title: speechResponse.data.session.scenarios?.title || 'Practice Session',
          speech_feedback: speechResponse.data.feedback,
          visual_feedback: visualResponse.data.feedback
        };

        setAnalysis(combinedAnalysis);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analysis:', error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          navigate('/login');
          return;
        }
        setError('Failed to load analysis data.');
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, navigate, session]);

  const getModuleTitle = (moduleId: number) => {
    return "Practice Session";
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-[#4CAF50]';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const ScoreCard: React.FC<{ label: string; score: number | undefined }> = ({ label, score }) => (
    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} mb-1`}>{label}</div>
      <div className={`text-xl font-semibold ${getScoreColor(score ?? 0)}`}>
        {score !== undefined ? score.toFixed(1) : 'N/A'}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header Section */}
      <div className="bg-[#235390]">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/scores')}
                className="flex items-center space-x-2 text-white hover:text-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Scores</span>
              </button>
            </div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>
              Session Analysis
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
          </div>
        ) : error ? (
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
            {error}
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Session Info */}
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>
                    {analysis.module_title}
                  </h2>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {formatDate(analysis.created_at)}
                  </p>
                </div>
                <span className="px-3 py-1 bg-[#4CAF50] text-white rounded-full text-sm">
                  Session Complete
                </span>
              </div>
            </div>

            {/* Speech Analysis */}
            {analysis.speech_feedback && (
              <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Speech Analysis</h3>
                  <span className="text-[#4CAF50] font-medium">
                    Overall Score: {analysis.speech_feedback.overall_score.toFixed(1)}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <ScoreCard label="Fluency" score={analysis.speech_feedback?.fluency_score} />
                  <ScoreCard label="Confidence" score={analysis.speech_feedback?.confidence_score} />
                  <ScoreCard label="Clarity" score={analysis.speech_feedback?.clarity_score} />
                  <ScoreCard label="Content" score={analysis.speech_feedback?.content_score} />
                  <ScoreCard label="Pace" score={analysis.speech_feedback?.pace_score} />
                  <ScoreCard label="Volume" score={analysis.speech_feedback?.volume_score} />
                  <ScoreCard label="Pausing" score={analysis.speech_feedback?.pause_score} />
                </div>
                <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-3 flex items-center`}>
                    <span className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full mr-2"></span>
                    Feedback
                  </h4>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-pre-line`}>
                    {analysis.speech_feedback?.feedback_text || 'No feedback available'}
                  </p>
                </div>
              </div>
            )}

            {/* Visual Analysis */}
            {analysis.visual_feedback && (
              <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Visual Analysis</h3>
                  <span className="text-[#4CAF50] font-medium">
                    Overall Score: {analysis.visual_feedback.overall_score.toFixed(1)}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <ScoreCard label="Eye Contact" score={analysis.visual_feedback?.eye_contact_score} />
                  <ScoreCard label="Smile" score={analysis.visual_feedback?.smile_score} />
                  <ScoreCard label="Posture" score={analysis.visual_feedback?.posture_score} />
                  <ScoreCard label="Expression" score={analysis.visual_feedback?.expression_score} />
                  <ScoreCard label="Visibility" score={analysis.visual_feedback?.visibility_score} />
                </div>
                <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-3 flex items-center`}>
                    <span className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full mr-2"></span>
                    Feedback
                  </h4>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-pre-line`}>
                    {analysis.visual_feedback?.feedback_text || 'No feedback available'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Analysis; 