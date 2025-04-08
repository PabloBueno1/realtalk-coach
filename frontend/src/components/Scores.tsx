import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, ChevronUp, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, [currentPage]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      // Fetch sessions with pagination
      const response = await axios.get(`http://localhost:8000/scores/combined?page=${currentPage}&page_size=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setSessions(response.data);
      // If we got less than 5 items, we've reached the end
      setHasMore(response.data.length === 5);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions');
      setLoading(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
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
          <>
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
            
            {/* Pagination Controls */}
            <div className="mt-6 flex justify-center items-center space-x-4">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-full ${
                  currentPage === 1
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-gray-600 dark:text-gray-300">
                Page {currentPage}
              </span>
              <button
                onClick={handleNextPage}
                disabled={!hasMore}
                className={`p-2 rounded-full ${
                  !hasMore
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Scores; 