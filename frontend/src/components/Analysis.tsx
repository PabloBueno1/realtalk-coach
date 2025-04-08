import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';

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
  posture_score: number;
  expression_score: number;
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
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);

      if (!id) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
      };

      // Fetch speech feedback
      const speechFeedback = await axios.get(
        `http://localhost:8000/speech/sessions/${id}/feedback`,
        { headers }
      ).catch(() => null);

      // Fetch visual feedback
      const visualFeedback = await axios.get(
        `http://localhost:8000/visual/sessions/${id}/feedback`,
        { headers }
      ).catch(() => null);

      // Fetch session details from speech sessions
      const sessionDetails = await axios.get(
        `http://localhost:8000/speech/sessions/${id}`,
        { headers }
      );

      setAnalysis({
        id: id,
        created_at: sessionDetails.data.created_at,
        module_id: sessionDetails.data.module_id || 1,
        module_title: getModuleTitle(sessionDetails.data.module_id || 1),
        speech_feedback: speechFeedback?.data,
        visual_feedback: visualFeedback?.data
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      setError('Failed to load analysis');
      setLoading(false);
    }
  };

  const getModuleTitle = (moduleId: number) => {
    const moduleTitles: Record<number, string> = {
      1: 'Formal',
      2: 'Informal',
      3: 'Presentations',
      4: 'Networking',
    };
    return moduleTitles[moduleId] || `Module ${moduleId}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600 dark:text-green-400';
    if (score >= 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
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
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${getScoreColor(score ?? 0)}`}>
        {score !== undefined ? score.toFixed(1) : 'N/A'}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate('/scores')}
            className="mr-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Session Analysis</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-lg">
            {error}
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Session Info */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                {analysis.module_title}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {formatDate(analysis.created_at)}
              </p>
            </div>

            {/* Speech Analysis */}
            {analysis.speech_feedback && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Speech Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <ScoreCard label="Overall" score={analysis.speech_feedback?.overall_score} />
                  <ScoreCard label="Fluency" score={analysis.speech_feedback?.fluency_score} />
                  <ScoreCard label="Confidence" score={analysis.speech_feedback?.confidence_score} />
                  <ScoreCard label="Clarity" score={analysis.speech_feedback?.clarity_score} />
                  <ScoreCard label="Content" score={analysis.speech_feedback?.content_score} />
                  <ScoreCard label="Pace" score={analysis.speech_feedback?.pace_score} />
                  <ScoreCard label="Volume" score={analysis.speech_feedback?.volume_score} />
                  <ScoreCard label="Pausing" score={analysis.speech_feedback?.pause_score} />
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Feedback</h4>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                    {analysis.speech_feedback?.feedback_text || 'No feedback available'}
                  </p>
                </div>
              </div>
            )}

            {/* Visual Analysis */}
            {analysis.visual_feedback && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Visual Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <ScoreCard label="Overall" score={analysis.visual_feedback?.overall_score} />
                  <ScoreCard label="Eye Contact" score={analysis.visual_feedback?.eye_contact_score} />
                  <ScoreCard label="Posture" score={analysis.visual_feedback?.posture_score} />
                  <ScoreCard label="Expression" score={analysis.visual_feedback?.expression_score} />
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Feedback</h4>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                    {analysis.visual_feedback?.feedback_text || 'No feedback available'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center">
            <p className="text-gray-600 dark:text-gray-300">No analysis data available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis; 