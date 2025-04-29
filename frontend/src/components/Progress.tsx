import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const API_URL = process.env.REACT_APP_API_URL;

interface Session {
  id: string;
  created_at: string;
  module_id: string;
  module_title: string;
  speech_score: number;
  visual_score: number;
  overall_score: number;
}

const Progress: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      calculateStreaks();
    }
  }, [sessions]);

  const calculateStreaks = () => {
    if (sessions.length === 0) {
      setCurrentStreak(0);
      setLongestStreak(0);
      return;
    }

    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    let currentStreakCount = 0;
    let longestStreakCount = 0;
    let tempStreak = 1; // Start with 1 for the first session
    let lastDate = new Date(sortedSessions[0].created_at);
    lastDate.setHours(0, 0, 0, 0);

    // Check if the most recent session was today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastDate.getTime() === today.getTime() || lastDate.getTime() === yesterday.getTime()) {
      currentStreakCount = 1;
    }

    // Calculate streaks
    for (let i = 1; i < sortedSessions.length; i++) {
      const currentDate = new Date(sortedSessions[i].created_at);
      currentDate.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        if (i === 1) { // If this is the second session and it's consecutive
          currentStreakCount++;
        }
      } else if (diffDays > 1) {
        longestStreakCount = Math.max(longestStreakCount, tempStreak);
        tempStreak = 1;
        if (currentStreakCount > 0) {
          break; // Current streak is broken
        }
      }

      lastDate = currentDate;
    }

    setCurrentStreak(currentStreakCount);
    setLongestStreak(Math.max(longestStreakCount, tempStreak));
  };

  const getWeeklyActivity = () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 6); // Include today
    lastWeek.setHours(0, 0, 0, 0);

    const dailySessions = Array(7).fill(0);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    sessions.forEach(session => {
      const sessionDate = new Date(session.created_at);
      sessionDate.setHours(0, 0, 0, 0);
      
      if (sessionDate >= lastWeek) {
        const dayIndex = sessionDate.getDay();
        dailySessions[dayIndex]++;
      }
    });

    // Get the last 7 days starting from today
    const result = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      result.unshift({
        day: days[date.getDay()],
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sessions: dailySessions[date.getDay()]
      });
    }

    return result;
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/scores/combined`, {
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
    if (score >= 4) return '#4CAF50';
    if (score >= 3) return '#FFC107';
    return '#F44336';
  };

  const chartData = sessions.map(session => ({
    date: new Date(session.created_at).toLocaleDateString(),
    speech: session.speech_score,
    visual: session.visual_score,
    overall: session.overall_score
  }));

  const averageScores = {
    speech: sessions.reduce((acc, curr) => acc + curr.speech_score, 0) / sessions.length,
    visual: sessions.reduce((acc, curr) => acc + curr.visual_score, 0) / sessions.length,
    overall: sessions.reduce((acc, curr) => acc + curr.overall_score, 0) / sessions.length
  };

  const pieData = [
    { name: 'Poor (1-2)', value: sessions.filter(s => s.speech_score <= 2).length + sessions.filter(s => s.visual_score <= 2).length },
    { name: 'Average (3)', value: sessions.filter(s => s.speech_score === 3).length + sessions.filter(s => s.visual_score === 3).length },
    { name: 'Good (4-5)', value: sessions.filter(s => s.speech_score >= 4).length + sessions.filter(s => s.visual_score >= 4).length }
  ];

  const COLORS = ['#F44336', '#FFC107', '#4CAF50'];

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
            <h1 className="text-2xl font-bold text-white">
              Your Progress
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
          <div className="space-y-8">
            {/* Streak Information */}
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Activity Streaks
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white'} shadow`}>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Current Streak</div>
                  <div className={`text-2xl font-bold ${currentStreak >= 3 ? 'text-[#4CAF50]' : isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {currentStreak} days
                    {currentStreak >= 3 && (
                      <span className="ml-2 text-yellow-500">🔥</span>
                    )}
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white'} shadow`}>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Longest Streak</div>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {longestStreak} days
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Activity Chart */}
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Weekly Activity
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getWeeklyActivity()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white'} shadow-lg`}>
                              <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                                Sessions: {payload[0].value}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="sessions" fill="#2196F3" name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line Chart - Progress Over Time */}
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Progress Over Time
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="speech"
                      stroke="#4CAF50"
                      name="Speech Score"
                    />
                    <Line
                      type="monotone"
                      dataKey="visual"
                      stroke="#2196F3"
                      name="Visual Score"
                    />
                    <Line
                      type="monotone"
                      dataKey="overall"
                      stroke="#FFC107"
                      name="Overall Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart - Average Scores */}
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Average Scores
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[averageScores]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="speech" fill="#4CAF50" name="Speech Score" />
                    <Bar dataKey="visual" fill="#2196F3" name="Visual Score" />
                    <Bar dataKey="overall" fill="#FFC107" name="Overall Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart - Score Distribution by Range */}
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Score Distribution by Range
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
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

export default Progress; 