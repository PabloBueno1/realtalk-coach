import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, ChevronUp, ArrowLeft, RefreshCw } from 'lucide-react';

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
  feedback_text?: string;
  score?: number;
}

interface Session {
  id: string;
  created_at: string;
  module_id: number;
  module_title: string;
  speech_data: SpeechData;
  visual_data?: VisualData;
  speech_score?: number;
  visual_score?: number;
  overall_score?: number;
}

const Scores: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch speech sessions and their feedback
      const speechResponse = await axios.get('http://localhost:8000/speech/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Fetch visual sessions and their feedback
      const visualResponse = await axios.get('http://localhost:8000/visual/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Fetch feedback for each speech session
      const speechSessionsWithFeedback = await Promise.all(
        speechResponse.data.map(async (speechSession: any) => {
          try {
            const feedbackResponse = await axios.get(
              `http://localhost:8000/speech/sessions/${speechSession.id}/feedback`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              }
            );
            return {
              ...speechSession,
              feedback_text: feedbackResponse.data.feedback_text,
              score: feedbackResponse.data.overall_score
            };
          } catch (error) {
            console.error(`Error fetching speech feedback for session ${speechSession.id}:`, error);
            return {
              ...speechSession,
              feedback_text: 'No feedback available',
              score: 0
            };
          }
        })
      );

      // Create a map of visual sessions with their feedback
      const visualSessionsMap = new Map();
      for (const visualSession of visualResponse.data) {
        try {
          const feedbackResponse = await axios.get(
            `http://localhost:8000/visual/sessions/${visualSession.id}/feedback`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );
          visualSessionsMap.set(visualSession.id, {
            ...visualSession,
            feedback_text: feedbackResponse.data.feedback_text,
            score: feedbackResponse.data.overall_score
          });
        } catch (error) {
          console.error(`Error fetching visual feedback for session ${visualSession.id}:`, error);
          visualSessionsMap.set(visualSession.id, {
            ...visualSession,
            feedback_text: 'No feedback available',
            score: 0
          });
        }
      }

      // Combine speech and visual data
      const combinedSessions = speechSessionsWithFeedback.map((speechSession: any) => {
        const visualData = visualSessionsMap.get(speechSession.id);
        return {
          id: speechSession.id,
          created_at: speechSession.created_at,
          module_id: speechSession.module_id || 1, // Default to module 1 if not specified
          module_title: getModuleTitle(speechSession.module_id || 1),
          speech_data: speechSession,
          visual_data: visualData,
          speech_score: speechSession.score || 0,
          visual_score: visualData?.score || 0,
          overall_score: ((speechSession.score || 0) + (visualData?.score || 0)) / 2
        };
      });

      setSessions(combinedSessions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions');
      setLoading(false);
    }
  };

  const toggleExpand = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate('/home')}
            className="mr-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Your Practice Sessions</h1>
          <button 
            onClick={fetchSessions}
            className="ml-auto p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            title="Refresh sessions"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-lg">
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center">
            <p className="text-gray-600 dark:text-gray-300">You haven't completed any practice sessions yet.</p>
            <button 
              onClick={() => navigate('/home')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Start Practicing
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-6 text-center">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Overall</div>
                      <div className={`text-2xl font-bold ${getScoreColor(session.overall_score || 0)}`}>
                        {(session.overall_score || 0).toFixed(1)}
                      </div>
                    </div>
                    <div className="mr-6 text-center">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Speech</div>
                      <div className={`text-xl font-semibold ${getScoreColor(session.speech_score || 0)}`}>
                        {(session.speech_score || 0).toFixed(1)}
                      </div>
                    </div>
                    <div className="mr-6 text-center">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Visual</div>
                      <div className={`text-xl font-semibold ${getScoreColor(session.visual_score || 0)}`}>
                        {(session.visual_score || 0).toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">
                        {getModuleTitle(session.module_id)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(session.created_at)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <button 
                      onClick={() => navigate(`/analysis/${session.id}`)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      View Full Analysis
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scores; 