import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  PieChart,
  Pie,
  Cell,
  Line,
  LineChart,
  BarChart,
  Area,
  AreaChart,
  ReferenceLine,
  ReferenceArea,
  ComposedChart,
  TooltipProps
} from 'recharts';
import { ChartItem, desktopOS, valueFormatter } from '../utils/webUsageStats';
import { PieChart as MuiPieChart } from '@mui/x-charts/PieChart';
import { PieValueType } from '@mui/x-charts/models';

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

// Memoized chart component to prevent unnecessary re-renders
const ScoreDistributionChart = memo(({ data }: { data: any[] }) => {
  const COLORS = ['#F44336', '#FFC107', '#4CAF50'];
  const RADIAN = Math.PI / 180;
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: any, name: any, props: any) => {
            return [`${value} sessions`, props.payload.name];
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
});

// PieActiveArc component using MUI X Charts
const PieActiveArc = ({ isDarkMode }: { isDarkMode: boolean }) => {
  // Create a compatible valueFormatter for MUI X Charts
  const pieValueFormatter = (value: any) => `${value.value}`;
  
  return (
    <MuiPieChart
      series={[
        {
          data: desktopOS,
          highlightScope: { fade: 'global', highlight: 'item' },
          faded: { innerRadius: 39, additionalRadius: -39, color: 'gray' },
          valueFormatter: pieValueFormatter,
        },
      ]}
      height={253}
      width={380}
      slotProps={{
        legend: {
          direction: 'column',
          position: { vertical: 'middle', horizontal: 'right' },
          padding: 1,
          labelStyle: {
            fill: isDarkMode ? 'white' : 'inherit', // Use fill for SVG text color
          }
        },
      }}
      margin={{ right: 180 }}
    />
  );
};

// Custom tooltip component for score chart
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    // Filter out area series data
    const visibleData = payload.filter(entry => !entry.name?.includes('Area'));
    
    if (visibleData.length === 0) return null;
    
    return (
      <div className="custom-tooltip bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        {visibleData.map((entry, index) => (
          <div key={index} className="tooltip-item">
            <span style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
        <div className="tooltip-date text-xs text-gray-500 dark:text-gray-400 mt-1">
          {label}
        </div>
      </div>
    );
  }
  
  return null;
};

const Dashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [chartMode, setChartMode] = useState<'scores' | 'activity'>('scores');
  const [prevCurrentStreak, setPrevCurrentStreak] = useState(0);
  const [prevAverageScore, setPrevAverageScore] = useState(0);
  const [prevBestScore, setPrevBestScore] = useState(0);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      // Store previous values before calculating new ones
      setPrevCurrentStreak(currentStreak);
      setPrevAverageScore(sessions.length > 0 ? sessions.reduce((acc, curr) => acc + curr.overall_score, 0) / sessions.length : 0);
      setPrevBestScore(sessions.length > 0 ? Math.max(...sessions.map(s => s.overall_score)) : 0);
      
      calculateStreaks();
    }
  }, [sessions]);

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
    const dates = [];

    // Get the last 7 days starting from today
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push({
        day: days[date.getDay()],
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dayIndex: date.getDay()
      });
    }

    sessions.forEach(session => {
      const sessionDate = new Date(session.created_at);
      sessionDate.setHours(0, 0, 0, 0);
      
      if (sessionDate >= lastWeek) {
        const dayIndex = sessionDate.getDay();
        dailySessions[dayIndex]++;
      }
    });

    return dates.map(dateInfo => ({
      day: dateInfo.day,
      date: dateInfo.date,
      sessions: dailySessions[dateInfo.dayIndex]
    }));
  };
  
  // Process data for dashboard
  const weeklyData = getWeeklyActivity();
  const totalSessions = sessions.length;
  const sessionsChange = "+17%"; // This would be calculated based on previous period
  
  const averageScores = sessions.length > 0 ? {
    speech: sessions.reduce((acc, curr) => acc + curr.speech_score, 0) / sessions.length,
    visual: sessions.reduce((acc, curr) => acc + curr.visual_score, 0) / sessions.length,
    overall: sessions.reduce((acc, curr) => acc + curr.overall_score, 0) / sessions.length
  } : { speech: 0, visual: 0, overall: 0 };
  
  // Browser distribution data (simulated)
  const browserData = [
    { name: 'Firefox', value: 44, color: '#0a215c' },
    { name: 'Safari', value: 22, color: '#a9c9a3' },
    { name: 'Chrome', value: 18, color: '#d9d3d0' },
    { name: 'Explorer', value: 16, color: '#c8a887' }
  ];
  
  // Score distribution data
  useEffect(() => {
    // Update the score distribution data in the right format for Recharts
    const scoreData = [
      { 
        name: 'Poor (1-2)', 
        value: sessions.filter(s => s.overall_score <= 2).length,
      },
      { 
        name: 'Average (3)', 
        value: sessions.filter(s => s.overall_score === 3).length,
      },
      { 
        name: 'Good (4-5)', 
        value: sessions.filter(s => s.overall_score >= 4).length,
      },
    ];
    
    // Filter out items with zero value to avoid rendering issues
    const filteredData = scoreData.filter(item => item.value > 0);
    
    // Store it in window object to avoid re-renders while keeping state available globally
    (window as any).scoreChartData = filteredData.length > 0 ? filteredData : scoreData;
    
    // Update desktopOS data for the MUI X Chart
    desktopOS[0].value = sessions.filter(s => s.overall_score <= 2).length;
    desktopOS[1].value = sessions.filter(s => s.overall_score === 3).length;
    desktopOS[2].value = sessions.filter(s => s.overall_score >= 4).length;
  }, [sessions]);
  
  // Recent performance (last 3 sessions)
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);
  
  // Get last 7 sessions for carousel
  const lastSevenSessions = [...sessions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 7);
  
  // State to track current session in carousel
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  
  // Handler for moving to next or previous session
  const navigateSession = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentSessionIndex(prev => 
        prev < lastSevenSessions.length - 1 ? prev + 1 : prev
      );
    } else {
      setCurrentSessionIndex(prev => prev > 0 ? prev - 1 : prev);
    }
  };
  
  // Data for Score Chart (Last 7 sessions)
  const scoreChartData = [...sessions]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-7) // Get last 7 sessions
    .map(s => ({
      date: new Date(s.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }), // Format as MM/DD
      speechScore: s.speech_score,
      visualScore: s.visual_score
    }));
    
  // Log data for debugging
  console.log("Score Chart Data:", scoreChartData);

  // CustomizedDot component for visibility testing
  const CustomizedDot = (props: any) => {
    const { cx, cy, stroke, payload, value } = props;
    
    if (value === null || value === undefined) {
      return null;
    }
    
    return (
      <svg x={cx - 5} y={cy - 5} width={10} height={10} fill={stroke} viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="5" />
      </svg>
    );
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
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
              Your Dashboard
            </h1>
          </div>
        </div>
      </div>
      
      {/* User Greeting & Condensed Stats */}
      <div className="max-w-7xl mx-auto pt-6 px-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">My Progress</h2>
          </div>
        </div>
        
        {/* Condensed Stats Row */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Merged Overview and Summary Container */}
            <div className={`p-4 rounded-xl ${isDarkMode ? '' : ''} flex flex-col justify-between`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Overview</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Sessions</h3>
                  <span className="text-2xl font-bold">{totalSessions}</span>
                </div>
                <div>
                  <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Average Score</h3>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">{averageScores.overall.toFixed(1)}</span>
                    {averageScores.overall > prevAverageScore && prevAverageScore > 0 && (
                      <span className="ml-2 text-sm text-green-500">
                        +{(((averageScores.overall - prevAverageScore) / prevAverageScore) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Streak</h3>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">{currentStreak} days</span>
                    {currentStreak > prevCurrentStreak && (
                      <span className="ml-2 text-sm text-green-500">+1</span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${currentStreak >= 3 ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {currentStreak >= 3 ? '🔥' : 'Keep practicing!'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Longest Streak</h3>
                  <span className="text-2xl font-bold">{longestStreak} days</span>
                </div>
                <div>
                  <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Best Score</h3>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">
                      {sessions.length > 0 ? Math.max(...sessions.map(s => s.overall_score)).toFixed(1) : '0.0'}
                    </span>
                    {Math.max(...sessions.map(s => s.overall_score)) > prevBestScore && prevBestScore > 0 && (
                      <span className="ml-2 text-sm text-green-500">
                        +{(Math.max(...sessions.map(s => s.overall_score)) - prevBestScore).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Condensed Recent Session Details - Now on the right */}
            <div className={`p-4 rounded-xl ${isDarkMode ? '' : ''}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Recent Sessions</h2>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => navigateSession('prev')}
                    disabled={currentSessionIndex === 0}
                    className={`p-1 rounded ${
                      currentSessionIndex === 0 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs text-gray-500">
                    {lastSevenSessions.length > 0 ? `${currentSessionIndex + 1}/${lastSevenSessions.length}` : '0/0'}
                  </span>
                  <button 
                    onClick={() => navigateSession('next')}
                    disabled={currentSessionIndex === lastSevenSessions.length - 1 || lastSevenSessions.length === 0}
                    className={`p-1 rounded ${
                      currentSessionIndex === lastSevenSessions.length - 1 || lastSevenSessions.length === 0
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              {lastSevenSessions.length > 0 ? (
                <>
                  <p className="font-medium text-base truncate mt-2">{lastSevenSessions[currentSessionIndex].module_title || 'Practice Session'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{new Date(lastSevenSessions[currentSessionIndex].created_at).toLocaleDateString()}</p>
                  <div className="flex flex-col">
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Overall:</span>
                      <span className="text-xl font-bold">{lastSevenSessions[currentSessionIndex].overall_score.toFixed(1)}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">/ 5</span>
                    </div>
                    
                    {/* Visual score representation */}
                    <div className="w-full h-3 bg-gray-200 dark:bg-gray-600 rounded-full mb-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          lastSevenSessions[currentSessionIndex].overall_score >= 4 ? 'bg-green-500' :
                          lastSevenSessions[currentSessionIndex].overall_score >= 3 ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${(lastSevenSessions[currentSessionIndex].overall_score / 5) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-baseline space-x-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Speech:</span>
                      <span className="font-medium">{lastSevenSessions[currentSessionIndex].speech_score.toFixed(1)}</span>
                      <span className="text-gray-500 dark:text-gray-400">Visual:</span>
                      <span className="font-medium">{lastSevenSessions[currentSessionIndex].visual_score.toFixed(1)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-2xl font-bold">N/A</span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CAF50]"></div>
        </div>
      ) : error ? (
        <div className={`p-4 rounded-lg mx-6 my-4 ${isDarkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <span className="text-6xl mb-4">🚧</span>
            <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
            <p className="text-gray-500 dark:text-gray-400">Complete your first session to see your progress dashboard.</p>
          </div>
        </div>
      ) : (
        /* Main content area - Removed outer grid */
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6"> 
          {/* Combined Activity & Score Chart (Enlarged) */}
          <div className={`p-4 rounded-xl`}> 
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-medium">Statistics</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {chartMode === 'scores' ? 'Score History' : 'Weekly Activity'}
                </span>
                <div className="flex">
                  <button 
                    onClick={() => setChartMode('scores')}
                    className={`p-1 rounded-l ${
                      chartMode === 'activity' 
                        ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700' 
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={chartMode === 'scores'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setChartMode('activity')}
                    className={`p-1 rounded-r ${
                      chartMode === 'scores' 
                        ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700' 
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={chartMode === 'activity'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="h-[500px]">
              {/* Direct render of chart with explicit dimensions */}
              {chartMode === 'scores' ? (
                <div className="w-full h-[450px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={scoreChartData}
                      margin={{top: 20, right: 20, left: 20, bottom: 20}}
                    >
                      {/* Add gradient definitions */}
                      <defs>
                        <linearGradient id="speechGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A89BFF" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#A89BFF" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="visualGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#57D0FF" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#57D0FF" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      
                      {/* Use gradient references for fills */}
                      <Area 
                        type="monotone" 
                        dataKey="speechScore" 
                        fill="url(#speechGradient)" 
                        stroke="none"
                        name="Speech Area"
                        legendType="none"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="visualScore" 
                        fill="url(#visualGradient)" 
                        stroke="none"
                        name="Visual Area"
                        legendType="none"
                      />
                      
                      {/* Keep the same line colors */}
                      <Line
                        type="monotone"
                        dataKey="speechScore"
                        name="Speech Score"
                        stroke="#8778FF"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="visualScore"
                        name="Visual Score"
                        stroke="#00C8FF"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                /* Activity Chart (BarChart) */
                <div className="w-full h-[450px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={weeklyData} 
                      margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }}/>
                      <YAxis 
                        allowDecimals={false} 
                        width={30} 
                        tick={{ fontSize: 12 }}
                        domain={[0, 'auto']}
                      />
                      <Tooltip />
                      <Bar dataKey="sessions" name="Sessions" fill="#2196F3" barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
          
          {/* Score Distribution (MUI X Charts) - Now in a grid to match the width of My Progress containers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Score Categories</h2>
              </div>
              <div className="flex justify-center items-center h-48">
                <PieActiveArc isDarkMode={isDarkMode} />
              </div>
            </div>
            
            {/* New container next to pie chart */}
            <div className={`p-4 rounded-xl`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Performance Summary</h2>
              </div>
              <div className="h-48 flex flex-col justify-center">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Speech Score Avg</h3>
                    <div className="flex items-center">
                      <span className="text-xl font-bold">{averageScores.speech.toFixed(1)}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/ 5</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-1">
                      <div 
                        className="h-full rounded-full bg-purple-500"
                        style={{ width: `${(averageScores.speech / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Visual Score Avg</h3>
                    <div className="flex items-center">
                      <span className="text-xl font-bold">{averageScores.visual.toFixed(1)}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/ 5</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-1">
                      <div 
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${(averageScores.visual / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sessions This Week</h3>
                    <span className="text-xl font-bold">
                      {weeklyData.reduce((sum, day) => sum + day.sessions, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 