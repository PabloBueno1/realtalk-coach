import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  Pie,
  Cell,
  Line,
  BarChart,
  Area,
  ComposedChart,
  TooltipProps,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { ChartItem } from '../utils/webUsageStats';
import { PieChart as MuiPieChart } from '@mui/x-charts/PieChart';

const API_URL = process.env.REACT_APP_API_URL;

interface Session {
  id: string;
  created_at: string;
  module_id: string;
  module_title: string;
  speech_score: number;
  visual_score: number;
  overall_score: number;
  // Detailed speech metrics
  fluency_score?: number;
  confidence_score?: number;
  clarity_score?: number;
  content_score?: number;
  pace_score?: number;
  volume_score?: number;
  pausing_score?: number;
  // Detailed visual metrics
  eye_contact_score?: number;
  smile_score?: number;
  posture_score?: number;
  expression_score?: number;
  visibility_score?: number;
  speech_data?: {
    total_duration?: number;
    speaking_time?: number;
  };
  speech_feedback?: {
    fluency_score?: number;
    confidence_score?: number;
    clarity_score?: number;
    content_score?: number;
    pace_score?: number;
    volume_score?: number;
    pause_score?: number;
    overall_score?: number;
    feedback_text?: string;
  };
  visual_feedback?: {
    expression_score?: number;
    eye_contact_score?: number;
    posture_score?: number;
    smile_score?: number;
    visibility_score?: number;
    overall_score?: number;
    feedback_text?: string;
  };
}

// Helper function to format time duration
const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// PieActiveArc component using MUI X Charts
const PieActiveArc = ({ 
  categoryData, 
  isDarkMode, 
  size = { height: 320, width: 400 } 
}: { 
  categoryData: { name: string, value: number, color: string }[], 
  isDarkMode: boolean, 
  size?: { height: number, width: number } 
}) => {
  // Filter out categories with zero values
  const nonZeroCategories = categoryData.filter(item => item.value > 0);
  
  // Calculate total for percentages
  const total = nonZeroCategories.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Check if all values are zero
  const allZero = total === 0;
  
  // If all values are zero, create a special placeholder for visualization
  if (allZero) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-2 text-sm">No data available for chart</p>
        </div>
      </div>
    );
  }
  
  // Format data for MUI X Charts
  const chartData = nonZeroCategories.map((item, index) => {
    // Use actual values without tiny padding values now that we've filtered out zeros
    const percentage = (item.value / total * 100).toFixed(2);
    
    return {
      id: index,
      value: item.value,
      label: item.name,
      color: item.color,
      // Store percentage in the data object for the tooltip formatter
      formattedValue: `${item.name}  ${percentage}%`,
      // Create a custom property that will be accessed in the arcLabel function
      customProps: { displayValue: item.value, percentage }
    };
  });
  
  // Custom tooltip formatter to show percentages
  const valueFormatter = (item: any) => item.formattedValue;
  
  return (
    <MuiPieChart
      series={[
        {
          data: chartData,
          highlightScope: { 
            faded: 'global', 
            highlighted: 'item' 
          },
          faded: { 
            innerRadius: 0, 
            additionalRadius: -20, 
            color: '#333333'
          },
          highlighted: {
            additionalRadius: 5,
            cornerRadius: 0
          },
          arcLabel: (item) => {
            try {
              // Access raw data through index
              const index = item.id as number;
              const dataItem = chartData[index];
              if (!dataItem) return '';
              
              const percentage = dataItem.customProps?.percentage;
              
              // Only show labels for segments with actual data
              // For a single category, always show the percentage
              if (nonZeroCategories.length === 1 || parseFloat(percentage || '0') > 5) {
                return `${percentage}%`;
              }
              return '';
            } catch (e) {
              return '';
            }
          },
          arcLabelMinAngle: 20,
          paddingAngle: nonZeroCategories.length > 1 ? 1 : 0, // Only add padding if more than one category
          innerRadius: 0,
          outerRadius: 140,
          cornerRadius: 0,
          valueFormatter: valueFormatter
        },
      ]}
      height={size.height}
      width={size.width}
      margin={{ right: 20, bottom: 20, top: 20, left: 20 }}
      slotProps={{
        legend: { hidden: true }
      }}
      sx={{
        // Add custom styling for faded and highlighted states
        '& .MuiPieArc-faded': {
          opacity: 0.6,
          filter: 'brightness(0.5)'
        },
        '& .MuiPieArc-highlighted': {
          filter: 'brightness(1.05)',
          strokeWidth: 0
        },
        // Make arc labels bold
        '& .MuiPieArcLabel-root': {
          fontWeight: 'bold',
          fill: '#fff',
          fontSize: '0.75rem'
        }
      }}
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

// Add this new component before the Dashboard component
const PerformanceRadar = ({ sessions, isDarkMode }: { sessions: Session[], isDarkMode: boolean }) => {
  const [chartType, setChartType] = useState<'speech' | 'visual'>('speech');
  
  // Get last 3 sessions
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  const last3Sessions = sortedSessions.slice(0, 3);

  // Check if we have enough data to show the chart
  const hasEnoughData = last3Sessions.length > 0;
  
  // Calculate averages for the period
  const calculateAverages = (sessionList: Session[]) => {
    if (sessionList.length === 0) {
      return {
        // Speech metrics
        fluency: 0,
        confidence: 0,
        clarity: 0,
        content: 0,
        pace: 0,
        volume: 0,
        pause: 0,
        // Visual metrics
        expression: 0,
        eyeContact: 0,
        posture: 0,
        smile: 0,
        visibility: 0
      };
    }
    
    // Count valid sessions for each metric
    const validSessions = {
      speech: sessionList.filter(s => s.speech_feedback).length,
      visual: sessionList.filter(s => s.visual_feedback).length
    };

    const averages = {
      // Speech metrics
      fluency: sessionList.reduce((acc, curr) => acc + (curr.speech_feedback?.fluency_score || 0), 0) / validSessions.speech,
      confidence: sessionList.reduce((acc, curr) => acc + (curr.speech_feedback?.confidence_score || 0), 0) / validSessions.speech,
      clarity: sessionList.reduce((acc, curr) => acc + (curr.speech_feedback?.clarity_score || 0), 0) / validSessions.speech,
      content: sessionList.reduce((acc, curr) => acc + (curr.speech_feedback?.content_score || 0), 0) / validSessions.speech,
      pace: sessionList.reduce((acc, curr) => acc + (curr.speech_feedback?.pace_score || 0), 0) / validSessions.speech,
      volume: sessionList.reduce((acc, curr) => acc + (curr.speech_feedback?.volume_score || 0), 0) / validSessions.speech,
      pause: sessionList.reduce((acc, curr) => acc + (curr.speech_feedback?.pause_score || 0), 0) / validSessions.speech,
      // Visual metrics
      expression: sessionList.reduce((acc, curr) => acc + (curr.visual_feedback?.expression_score || 0), 0) / validSessions.visual,
      eyeContact: sessionList.reduce((acc, curr) => acc + (curr.visual_feedback?.eye_contact_score || 0), 0) / validSessions.visual,
      posture: sessionList.reduce((acc, curr) => acc + (curr.visual_feedback?.posture_score || 0), 0) / validSessions.visual,
      smile: sessionList.reduce((acc, curr) => acc + (curr.visual_feedback?.smile_score || 0), 0) / validSessions.visual,
      visibility: sessionList.reduce((acc, curr) => acc + (curr.visual_feedback?.visibility_score || 0), 0) / validSessions.visual
    };
    
    return averages;
  };
  
  const last3Averages = calculateAverages(last3Sessions);
  
  // Format data for speech radar chart
  const speechRadarData = [
    {
      subject: 'Fluency',
      'Last 3 Days': Number(last3Averages.fluency.toFixed(1))
    },
    {
      subject: 'Confidence',
      'Last 3 Days': Number(last3Averages.confidence.toFixed(1))
    },
    {
      subject: 'Clarity',
      'Last 3 Days': Number(last3Averages.clarity.toFixed(1))
    },
    {
      subject: 'Content',
      'Last 3 Days': Number(last3Averages.content.toFixed(1))
    },
    {
      subject: 'Pace',
      'Last 3 Days': Number(last3Averages.pace.toFixed(1))
    },
    {
      subject: 'Volume',
      'Last 3 Days': Number(last3Averages.volume.toFixed(1))
    },
    {
      subject: 'Pausing',
      'Last 3 Days': Number(last3Averages.pause.toFixed(1))
    }
  ];

  // Format data for visual radar chart
  const visualRadarData = [
    {
      subject: 'Expression',
      'Last 3 Days': Number(last3Averages.expression.toFixed(1))
    },
    {
      subject: 'Eye Contact',
      'Last 3 Days': Number(last3Averages.eyeContact.toFixed(1))
    },
    {
      subject: 'Posture',
      'Last 3 Days': Number(last3Averages.posture.toFixed(1))
    },
    {
      subject: 'Smile',
      'Last 3 Days': Number(last3Averages.smile.toFixed(1))
    },
    {
      subject: 'Visibility',
      'Last 3 Days': Number(last3Averages.visibility.toFixed(1))
    }
  ];
  
  if (!hasEnoughData) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No session data available</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Complete at least one session to see your performance metrics</p>
        </div>
      </div>
    );
  }

  const hasValidSpeechData = last3Sessions.some(s => s.speech_feedback);
  const hasValidVisualData = last3Sessions.some(s => s.visual_feedback);

  if (chartType === 'speech' && !hasValidSpeechData) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No speech feedback available</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Complete a session with speech feedback to see your speech metrics</p>
        </div>
      </div>
    );
  }

  if (chartType === 'visual' && !hasValidVisualData) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No visual feedback available</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Complete a session with visual feedback to see your visual metrics</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-[400px] w-full">
      <div className="flex justify-center mb-2">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-md flex">
          <button
            onClick={() => setChartType('speech')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              chartType === 'speech'
                ? 'bg-green-500 text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Speech Metrics
          </button>
          <button
            onClick={() => setChartType('visual')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              chartType === 'visual'
                ? 'bg-green-500 text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Visual Metrics
          </button>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart 
          cx="50%" 
          cy="50%" 
          outerRadius="85%" 
          data={chartType === 'speech' ? speechRadarData : visualRadarData}
        >
          <PolarGrid stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ 
              fill: isDarkMode ? '#D1D5DB' : '#4B5563',
              fontSize: 11 
            }} 
          />
          <Radar
            name="Last 3 Days"
            dataKey="Last 3 Days"
            stroke="#4CAF50"
            fill="#4CAF50"
            fillOpacity={0.3}
          />
          <Legend 
            wrapperStyle={{ 
              fontSize: '11px',
              color: isDarkMode ? '#D1D5DB' : '#4B5563',
              paddingTop: '10px'
            }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              color: isDarkMode ? '#D1D5DB' : '#4B5563',
              fontSize: '11px'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user || !session) {
      navigate('/login');
      return;
    }
  }, [user, session, navigate]);
  
  const normalizeScore = (score: any): number => {
    if (score === undefined || score === null) return NaN;
    const numScore = typeof score === 'object' ? parseFloat(String(score)) : 
                     typeof score === 'string' ? parseFloat(score) : 
                     Number(score);
    return numScore;
  };
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [chartMode, setChartMode] = useState<'scores' | 'activity' | 'categories'>('scores');
  const [prevCurrentStreak, setPrevCurrentStreak] = useState(0);
  const [prevAverageScore, setPrevAverageScore] = useState(0);
  const [categoryData, setCategoryData] = useState([
    { name: 'Poor (1-2)', value: 0, color: '#ff5252' },
    { name: 'Average (3)', value: 0, color: '#ffca28' },
    { name: 'Good (4-5)', value: 0, color: '#4caf50' }
  ]);
  const [categoryCount, setCategoryCount] = useState({
    poor: 0,
    average: 0,
    good: 0
  });
  const [visibleLines, setVisibleLines] = useState({
    speechScore: false,
    visualScore: false,
    overallScore: true
  });
  const [timeInterval, setTimeInterval] = useState('1W');

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      if (!session?.access_token) {
        navigate('/login');
        return;
      }
      let allSessions: Session[] = [];
      let currentPage = 1;
      const pageSize = 20;
      let hasMorePages = true;
      while (hasMorePages) {
        const response = await axios.get(`${API_URL}/scores/combined?page_size=${pageSize}&page=${currentPage}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (response.data && Array.isArray(response.data)) {
          allSessions = [...allSessions, ...response.data];
          if (response.data.length < pageSize) {
            hasMorePages = false;
          } else {
            currentPage++;
          }
        } else {
          console.error('Invalid response format:', response.data);
          setError('Invalid response format');
          hasMorePages = false;
        }
      }
      setSessions(allSessions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      setError('Failed to load sessions');
      setLoading(false);
    }
  }, [navigate, session?.access_token]);

  const calculateStreaks = useCallback(() => {
    if (sessions.length === 0) {
      setCurrentStreak(0);
      setLongestStreak(0);
      return;
    }
    const sessionsNewestFirst = [...sessions].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    let calculatedCurrentStreak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    let lastStreakDayNormalized = null;
    const firstSessionDateNormalized = new Date(sessionsNewestFirst[0].created_at);
    firstSessionDateNormalized.setHours(0, 0, 0, 0);
    if (firstSessionDateNormalized.getTime() === today.getTime() || firstSessionDateNormalized.getTime() === yesterday.getTime()) {
      calculatedCurrentStreak = 1;
      lastStreakDayNormalized = new Date(firstSessionDateNormalized.getTime());
      for (let i = 1; i < sessionsNewestFirst.length; i++) {
        const currentSessionDateNormalized = new Date(sessionsNewestFirst[i].created_at);
        currentSessionDateNormalized.setHours(0, 0, 0, 0);
        const expectedPrevDay = new Date(lastStreakDayNormalized.getTime());
        expectedPrevDay.setDate(expectedPrevDay.getDate() - 1);
        if (currentSessionDateNormalized.getTime() === expectedPrevDay.getTime()) {
          calculatedCurrentStreak++;
          lastStreakDayNormalized = new Date(currentSessionDateNormalized.getTime());
        } else if (currentSessionDateNormalized.getTime() === lastStreakDayNormalized.getTime()) {
          continue;
        } else {
          break;
        }
      }
    }
    setCurrentStreak(calculatedCurrentStreak);
    const sessionsOldestFirst = [...sessions].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    let calculatedLongestStreak = 0;
    if (sessionsOldestFirst.length > 0) {
      calculatedLongestStreak = 1;
      let tempStreakForLongest = 1;
      let prevDayForLongestNormalized = new Date(sessionsOldestFirst[0].created_at);
      prevDayForLongestNormalized.setHours(0, 0, 0, 0);
      for (let i = 1; i < sessionsOldestFirst.length; i++) {
        const currentDayForLongestNormalized = new Date(sessionsOldestFirst[i].created_at);
        currentDayForLongestNormalized.setHours(0, 0, 0, 0);
        const diffTime = currentDayForLongestNormalized.getTime() - prevDayForLongestNormalized.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreakForLongest++;
        } else if (diffDays > 1) {
          calculatedLongestStreak = Math.max(calculatedLongestStreak, tempStreakForLongest);
          tempStreakForLongest = 1;
        } else if (diffDays === 0) {
        } else {
          calculatedLongestStreak = Math.max(calculatedLongestStreak, tempStreakForLongest);
          tempStreakForLongest = 1;
        }
        prevDayForLongestNormalized = new Date(currentDayForLongestNormalized.getTime());
      }
      calculatedLongestStreak = Math.max(calculatedLongestStreak, tempStreakForLongest);
    }
    setLongestStreak(calculatedLongestStreak);
  }, [sessions]);
  
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (sessions.length > 0) {
      setPrevCurrentStreak(currentStreak);
      setPrevAverageScore(sessions.length > 0 ? 
        sessions.reduce((acc, curr) => acc + normalizeScore(curr.overall_score), 0) / sessions.length : 0);
      calculateStreaks();
    }
  }, [sessions, calculateStreaks, currentStreak]);

  const getWeeklyActivity = useCallback(() => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 6);
    lastWeek.setHours(0, 0, 0, 0);
    const dailySessions = Array(7).fill(0);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dates = [];
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
  }, [sessions]);
  
  const weeklyData = getWeeklyActivity();
  const totalSessions = sessions.length;
  
  // Calculate total time spent
  const totalTimeSpent = sessions.reduce((total, session) => {
    const duration = session.speech_data?.total_duration || 0;
    return total + duration;
  }, 0);

  const filterDataByTimeInterval = useCallback((data: Session[]): Session[] => {
    const now = new Date();
    let filterDate = new Date();
    switch (timeInterval) {
      case '1D':
        filterDate.setDate(now.getDate() - 1);
        break;
      case '1W':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        filterDate.setMonth(now.getMonth() - 3);
        break;
      case 'All':
        return data;
      default:
        filterDate.setDate(now.getDate() - 7);
    }
    return data.filter(session => new Date(session.created_at) >= filterDate);
  }, [timeInterval]);

  const filteredSessions = filterDataByTimeInterval(sessions);

  const averageScores = filteredSessions.length > 0 ? {
    speech: filteredSessions.reduce((acc, curr) => acc + normalizeScore(curr.speech_score), 0) / filteredSessions.length,
    visual: filteredSessions.reduce((acc, curr) => acc + normalizeScore(curr.visual_score), 0) / filteredSessions.length,
    overall: filteredSessions.reduce((acc, curr) => acc + normalizeScore(curr.overall_score), 0) / filteredSessions.length
  } : { speech: 0, visual: 0, overall: 0 };
  
  useEffect(() => {
    if (sessions.length === 0) return;
    const timeFilteredSessions = filterDataByTimeInterval(sessions);
    const recentSortedSessions = [...timeFilteredSessions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const validSessions = timeFilteredSessions.filter(s => {
      const score = normalizeScore(s.overall_score);
      return !isNaN(score);
    });
    
    const poorSessions = validSessions.filter(s => {
      const score = normalizeScore(s.overall_score);
      return score < 3;
    });
    const averageSessions = validSessions.filter(s => {
      const score = normalizeScore(s.overall_score);
      return score >= 3 && score < 4;
    });
    const goodSessions = validSessions.filter(s => {
      const score = normalizeScore(s.overall_score);
      return score >= 4;
    });
    
    const poorCount = poorSessions.length;
    const averageCount = averageSessions.length;
    const goodCount = goodSessions.length;
    
    const total = poorCount + averageCount + goodCount;
    
    setCategoryCount({
      poor: poorCount,
      average: averageCount,
      good: goodCount
    });
    setCategoryData([
      { name: 'Poor (<3)', value: poorCount, color: '#ff5252' },
      { name: 'Average (3)', value: averageCount, color: '#ffca28' },
      { name: 'Good (≥4)', value: goodCount, color: '#4caf50' }
    ]);
  }, [sessions, timeInterval, filterDataByTimeInterval]);
  
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
  
  // Data for Score Chart (filtered by time interval)
  const scoreChartData = [...filteredSessions]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .filter(s => {
      const speechScore = normalizeScore(s.speech_score);
      const visualScore = normalizeScore(s.visual_score);
      const overallScore = normalizeScore(s.overall_score);
      return (!isNaN(speechScore) && speechScore > 0) || 
             (!isNaN(visualScore) && visualScore > 0) || 
             (!isNaN(overallScore) && overallScore > 0);
    })
    .map(s => ({
      date: new Date(s.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }), // Format as MM/DD
      speechScore: s.speech_score,
      visualScore: s.visual_score,
      overallScore: s.overall_score
    }));
    
  // Custom legend that supports toggling lines
  const CustomLegend = () => {
    const handleToggle = (dataKey: string) => {
      setVisibleLines(prev => ({
        ...prev,
        [dataKey]: !prev[dataKey as keyof typeof prev]
      }));
    };
    
    // Define the three legend items exactly as in the image
    const legendItems = [
      { 
        key: 'speechScore', 
        color: '#8778FF', 
        name: 'Speech Score', 
        symbol: '-o-', 
        isActive: visibleLines.speechScore 
      },
      { 
        key: 'visualScore', 
        color: '#00C8FF', 
        name: 'Visual Score', 
        symbol: '-o-', 
        isActive: visibleLines.visualScore 
      },
      { 
        key: 'overallScore', 
        color: '#4CAF50', 
        name: 'Overall Score', 
        symbol: '-o-', 
        isActive: visibleLines.overallScore 
      }
    ];
    
    return (
      <div className="flex justify-center space-x-8 items-center text-xs">
        {legendItems.map((item) => (
          <div 
            key={item.key} 
            className={`flex items-center cursor-pointer transition-opacity ${item.isActive ? 'opacity-100' : 'opacity-50'}`}
            onClick={() => handleToggle(item.key)}
          >
            <span style={{ color: item.color }} className="mr-1">{item.symbol}</span>
            <span style={{ color: item.color }}>{item.name}</span>
          </div>
        ))}
      </div>
    );
  };

  // Get weekly activity data based on time interval
  const getTimeIntervalActivity = () => {
    let startDate = new Date();
    let days = 7; // Default for weekly view
    
    switch (timeInterval) {
      case '1D':
        days = 1;
        break;
      case '1W':
        days = 7;
        break;
      case '1M':
        days = 30;
        break;
      case '3M':
        days = 90;
        break;
      case 'All':
        // For 'All', use the earliest session date
        if (sessions.length > 0) {
          const earliestDate = new Date(
            Math.min(...sessions.map(s => new Date(s.created_at).getTime()))
          );
          days = Math.ceil((new Date().getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
          days = Math.max(days, 7); // Ensure at least 7 days
        }
        break;
    }
    
    startDate.setDate(startDate.getDate() - (days - 1)); // Include today
    startDate.setHours(0, 0, 0, 0);
    
    // For longer intervals, adjust the granularity
    let format: 'daily' | 'weekly' | 'monthly' = 'daily';
    if (days > 60) {
      format = 'monthly';
    } else if (days > 14) {
      format = 'weekly';
    }
    
    // Generate the appropriate data points based on format
    const activityData = [];
    
    if (format === 'daily') {
      // Daily format - show each day
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const sessionCount = sessions.filter(session => {
          const sessionDate = new Date(session.created_at);
          return sessionDate.toDateString() === date.toDateString();
        }).length;
        
        activityData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sessions: sessionCount
        });
      }
    } else if (format === 'weekly') {
      // Weekly format - group by week
      const weekMap = new Map();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // Get week number (using ISO week)
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day + (day === 0 ? -6 : 1)); // Adjust to Monday
        
        const weekKey = `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`;
        
        // Count sessions for this day
        const sessionCount = sessions.filter(session => {
          const sessionDate = new Date(session.created_at);
          return sessionDate.toDateString() === date.toDateString();
        }).length;
        
        // Add to the week's total
        if (weekMap.has(weekKey)) {
          weekMap.set(weekKey, {
            date: weekStart,
            sessions: weekMap.get(weekKey).sessions + sessionCount
          });
        } else {
          weekMap.set(weekKey, {
            date: weekStart,
            sessions: sessionCount
          });
        }
      }
      
      // Convert map to array and format dates
      weekMap.forEach((value, key) => {
        activityData.push({
          date: value.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sessions: value.sessions
        });
      });
    } else {
      // Monthly format - group by month
      const monthMap = new Map();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        // Count sessions for this day
        const sessionCount = sessions.filter(session => {
          const sessionDate = new Date(session.created_at);
          return sessionDate.toDateString() === date.toDateString();
        }).length;
        
        // Add to the month's total
        if (monthMap.has(monthKey)) {
          monthMap.set(monthKey, {
            date: new Date(date.getFullYear(), date.getMonth(), 1),
            sessions: monthMap.get(monthKey).sessions + sessionCount
          });
        } else {
          monthMap.set(monthKey, {
            date: new Date(date.getFullYear(), date.getMonth(), 1),
            sessions: sessionCount
          });
        }
      }
      
      // Convert map to array and format dates
      monthMap.forEach((value, key) => {
        activityData.push({
          date: value.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          sessions: value.sessions
        });
      });
    }
    
    return activityData.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  const activityData = getTimeIntervalActivity();

  return (
    <div className={`h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      {/* Header Section */}
      <div className="bg-[#235390]">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center space-x-2 text-white hover:text-gray-100 transition-colors text-sm sm:text-base flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to Home</span>
            </button>
            <h1 className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-white'} text-center flex-1 mx-2`}>
              Dashboard
            </h1>
            <button
              onClick={() => signOut()}
              className="text-white hover:text-gray-100 transition-colors text-sm sm:text-base flex-shrink-0"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content area - Fill remaining height */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4CAF50]"></div>
          </div>
        ) : error ? (
          <div className={`p-2 mx-4 my-2 ${isDarkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-2">🚧</span>
            <h2 className="text-xl font-bold mb-1">No Data Available</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Complete your first session to see your progress.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 p-1 landscape:min-h-[80vh]">
            {/* Left Column - All info in one container */}
            <div className="col-span-1 md:col-span-4 flex flex-col overflow-auto mb-2 md:mb-0">
              <div className={`p-2 flex-1 border border-gray-200 dark:border-gray-700 flex flex-col`}>
                {/* OVERVIEW Section */}
                <div className="mb-4">
                  <h2 className="text-sm font-medium mb-2 text-black dark:text-white">OVERVIEW</h2>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Total Sessions</div>
                      <div className="text-lg font-bold">{totalSessions}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Average Score</div>
                      <div className="flex items-center">
                        <span className="text-lg font-bold">{averageScores.overall.toFixed(1)}</span>
                        {averageScores.overall > prevAverageScore && prevAverageScore > 0 && (
                          <span className="ml-2 text-xs text-green-500">+{(((averageScores.overall - prevAverageScore) / prevAverageScore) * 100).toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Current Streak</div>
                      <div className="flex items-center">
                        <span className="text-lg font-bold">{currentStreak} days</span>
                        {currentStreak > prevCurrentStreak && (
                          <span className="ml-1 text-xs text-green-500">+1</span>
                        )}
                        {currentStreak >= 3 && <span className="ml-1">🔥</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Longest Streak</div>
                      <div className="text-lg font-bold">{longestStreak} days</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Best Score</div>
                      <div className="text-lg font-bold">
                        {sessions.length > 0 ? Math.max(...sessions.map(s => normalizeScore(s.overall_score))).toFixed(1) : '0.0'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Time Spent</div>
                      <div className="text-lg font-bold">
                        {formatDuration(totalTimeSpent)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* PERFORMANCE SUMMARY Section */}
                <div className="mb-4">
                  <h2 className="text-sm font-medium mb-2 text-black dark:text-white">PERFORMANCE SUMMARY</h2>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500">Speech Score Avg</span>
                        <span className="font-medium">{averageScores.speech.toFixed(1)}/5</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full">
                        <div 
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${(averageScores.speech / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500">Visual Score Avg</span>
                        <span className="font-medium">{averageScores.visual.toFixed(1)}/5</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full">
                        <div 
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${(averageScores.visual / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sessions This Week</span>
                      <span className="font-medium">
                        {weeklyData.reduce((sum, day) => sum + day.sessions, 0)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* RECENT SESSION Section */}
                <div>
                  <h2 className="text-sm font-medium mb-2 text-black dark:text-white">RECENT SESSION</h2>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center space-x-1 text-xs">
                      <button 
                        onClick={() => navigateSession('prev')}
                        disabled={currentSessionIndex === 0}
                        className={currentSessionIndex === 0 ? 'text-gray-400' : 'text-blue-500'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-gray-500">
                        {lastSevenSessions.length > 0 ? `${currentSessionIndex + 1}/${lastSevenSessions.length}` : '0/0'}
                      </span>
                      <button 
                        onClick={() => navigateSession('next')}
                        disabled={currentSessionIndex === lastSevenSessions.length - 1 || lastSevenSessions.length === 0}
                        className={currentSessionIndex === lastSevenSessions.length - 1 || lastSevenSessions.length === 0 ? 'text-gray-400' : 'text-blue-500'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {lastSevenSessions.length > 0 ? (
                    <div className="text-xs">
                      <p className="font-medium truncate">{lastSevenSessions[currentSessionIndex].module_title || 'Practice Session'}</p>
                      <p className="text-gray-500 mb-1">{new Date(lastSevenSessions[currentSessionIndex].created_at).toLocaleDateString()}</p>
                      
                      <div className="flex space-x-1 items-baseline mb-1">
                        <span className="text-gray-500">Overall:</span>
                        <span className="text-base font-bold">
                          {lastSevenSessions[currentSessionIndex].overall_score !== undefined 
                            ? normalizeScore(lastSevenSessions[currentSessionIndex].overall_score).toFixed(1) 
                            : '0.0'}
                        </span>
                        <span className="text-gray-500">/ 5</span>
                      </div>
                      
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full mb-1">
                        <div 
                          className={`h-full rounded-full ${
                            lastSevenSessions[currentSessionIndex].overall_score !== undefined &&
                            normalizeScore(lastSevenSessions[currentSessionIndex].overall_score) >= 4 ? 'bg-green-500' :
                            lastSevenSessions[currentSessionIndex].overall_score !== undefined &&
                            normalizeScore(lastSevenSessions[currentSessionIndex].overall_score) >= 3 ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                          style={{ 
                            width: `${(lastSevenSessions[currentSessionIndex].overall_score !== undefined 
                              ? (normalizeScore(lastSevenSessions[currentSessionIndex].overall_score) / 5) * 100 
                              : 0)}%` 
                          }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between">
                        <div>
                          <span className="text-gray-500">Speech: </span>
                          <span>
                            {lastSevenSessions[currentSessionIndex].speech_score !== undefined 
                              ? normalizeScore(lastSevenSessions[currentSessionIndex].speech_score).toFixed(1) 
                              : '0.0'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Visual: </span>
                          <span>
                            {lastSevenSessions[currentSessionIndex].visual_score !== undefined 
                              ? normalizeScore(lastSevenSessions[currentSessionIndex].visual_score).toFixed(1) 
                              : '0.0'}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => navigate(`/analysis/${lastSevenSessions[currentSessionIndex].id}`)}
                        className="mt-1 w-full py-0.5 text-xs text-gray-500 hover:text-blue-500 flex items-center justify-center"
                      >
                        <span>View Analysis</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-3 h-3 ml-1">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-500">No sessions available</span>
                  )}
                </div>

                {/* Add Performance Radar Chart */}
                <div className="mt-4">
                  <h2 className="text-sm font-medium mb-2 text-black dark:text-white">PERFORMANCE RADAR</h2>
                  <PerformanceRadar sessions={sessions} isDarkMode={isDarkMode} />
                </div>
              </div>
            </div>
            
            {/* Right Column - Chart */}
            <div className="col-span-1 md:col-span-8 flex flex-col">
              <div className={`p-2 flex-1 border border-gray-200 dark:border-gray-700 flex flex-col`}>
                <div className="flex justify-between items-center mb-0">
                  <div className="flex flex-col">
                    <h2 className="text-sm font-medium text-black dark:text-white">TRENDS</h2>
                    <div className="flex items-center space-x-0 text-xs mt-1">
                      {/* Time interval selector */}
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-md flex">
                        {['1D', '1W', '1M', '3M', 'All'].map((interval) => (
                          <button
                            key={interval}
                            onClick={() => setTimeInterval(interval)}
                            className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                              timeInterval === interval
                                ? 'bg-green-500 text-white'
                                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {interval}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-0 text-xs">
                    <div className="flex">
                      <button 
                        onClick={() => setChartMode('scores')}
                        className={`px-1 ${
                          chartMode === 'scores' 
                            ? 'text-blue-500 font-medium' 
                            : 'text-gray-500'
                        }`}
                      >
                        Scores
                      </button>
                      <button 
                        onClick={() => setChartMode('activity')}
                        className={`px-1 ${
                          chartMode === 'activity' 
                            ? 'text-blue-500 font-medium' 
                            : 'text-gray-500'
                        }`}
                      >
                        Activity
                      </button>
                      <button 
                        onClick={() => setChartMode('categories')}
                        className={`px-1 ${
                          chartMode === 'categories' 
                            ? 'text-blue-500 font-medium' 
                            : 'text-gray-500'
                        }`}
                      >
                        Categories
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-[250px] md:min-h-0">
                  {chartMode === 'scores' ? (
                    <div className="w-full h-[250px] md:h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={scoreChartData}
                          margin={{top: 3, right: 3, left: 0, bottom: 3}}
                        >
                          <defs>
                            <linearGradient id="speechGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#A89BFF" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#A89BFF" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="visualGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#57D0FF" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#57D0FF" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="overallGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }}/>
                          <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{fontSize: 10}} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend 
                            content={<CustomLegend />}
                            wrapperStyle={{fontSize: '10px'}}
                          />
                          
                          {visibleLines.speechScore && (
                            <Area type="monotone" dataKey="speechScore" fill="url(#speechGradient)" stroke="none" name="Speech Area" legendType="none" />
                          )}
                          {visibleLines.visualScore && (
                            <Area type="monotone" dataKey="visualScore" fill="url(#visualGradient)" stroke="none" name="Visual Area" legendType="none" />
                          )}
                          {visibleLines.overallScore && (
                            <Area type="monotone" dataKey="overallScore" fill="url(#overallGradient)" stroke="none" name="Overall Area" legendType="none" />
                          )}
                          
                          {visibleLines.speechScore && (
                            <Line
                              type="monotone"
                              dataKey="speechScore"
                              name="Speech Score"
                              stroke="#8778FF"
                              strokeWidth={2}
                              dot={{ r: 2 }}
                              isAnimationActive={false}
                            />
                          )}
                          {visibleLines.visualScore && (
                            <Line
                              type="monotone"
                              dataKey="visualScore"
                              name="Visual Score"
                              stroke="#00C8FF"
                              strokeWidth={2}
                              dot={{ r: 2 }}
                              isAnimationActive={false}
                            />
                          )}
                          {visibleLines.overallScore && (
                            <Line
                              type="monotone"
                              dataKey="overallScore"
                              name="Overall Score"
                              stroke="#4CAF50"
                              strokeWidth={2.5}
                              dot={{ r: 2 }}
                              isAnimationActive={false}
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : chartMode === 'activity' ? (
                    <div className="w-full h-[250px] md:h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={activityData} 
                          margin={{ top: 3, right: 3, left: 0, bottom: 3 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }}/>
                          <YAxis 
                            allowDecimals={false} 
                            width={25} 
                            tick={{ fontSize: 10 }}
                            domain={[0, (dataMax: number) => dataMax + 1]}
                          />
                          <Tooltip />
                          <Bar dataKey="sessions" name="Sessions" fill="#2196F3" barSize={15} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-full flex justify-center items-center">
                      <div className="w-full h-full flex flex-col items-center">
                        <div className="flex-1 w-full flex justify-center items-center">
                          <PieActiveArc 
                            categoryData={categoryData}
                            isDarkMode={isDarkMode}
                            size={{ height: 350, width: 400 }}
                          />
                        </div>
                        <div className="mb-2 flex justify-center text-xs">
                          <div className="flex gap-6 justify-center">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: '#ff5252' }}></div>
                              <div className="text-center">Poor (&lt;3)</div>
                              <div className="font-bold">{categoryCount.poor}</div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: '#ffca28' }}></div>
                              <div className="text-center">Average (3)</div>
                              <div className="font-bold">{categoryCount.average}</div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: '#4caf50' }}></div>
                              <div className="text-center">Good (≥4)</div>
                              <div className="font-bold">{categoryCount.good}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 