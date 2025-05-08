import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
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
          paddingAngle={2}
          minAngle={5}
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
    console.log("All category values are zero, creating placeholder data");
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
  
  console.log("Rendering chart with categories:", nonZeroCategories);
  
  // Format data for MUI X Charts
  const chartData = nonZeroCategories.map((item, index) => {
    // Use actual values without tiny padding values now that we've filtered out zeros
    const percentage = (item.value / total * 100).toFixed(2);
    
    console.log(`Category: ${item.name}, Value: ${item.value}, Total: ${total}, Percentage: ${percentage}%`);
    
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
              console.error("Error in arcLabel:", e);
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

const Dashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Add authentication check
  useEffect(() => {
    if (!user || !session) {
      navigate('/login');
      return;
    }
  }, [user, session, navigate]);
  
  // Helper function to safely convert score to number - move to top of component
  const normalizeScore = (score: any): number => {
    if (score === undefined || score === null) return NaN;
    
    // Convert string/object to number if necessary
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
  const [prevBestScore, setPrevBestScore] = useState(0);
  const [scoreDistributionData, setScoreDistributionData] = useState<ChartItem[]>([
    { id: 0, value: 0, label: 'Poor (1-2)', color: '#F44336' },
    { id: 1, value: 0, label: 'Average (3)', color: '#FFC107' },
    { id: 2, value: 0, label: 'Good (4-5)', color: '#4CAF50' }
  ]);
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
  // Track visible lines state
  const [visibleLines, setVisibleLines] = useState({
    speechScore: false,
    visualScore: false,
    overallScore: true
  });
  const [timeInterval, setTimeInterval] = useState('1W'); // Change default from '1M' to '1W'
  
  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      // Store previous values before calculating new ones
      setPrevCurrentStreak(currentStreak);
      setPrevAverageScore(sessions.length > 0 ? 
        sessions.reduce((acc, curr) => acc + normalizeScore(curr.overall_score), 0) / sessions.length : 0);
      setPrevBestScore(sessions.length > 0 ? 
        Math.max(...sessions.map(s => normalizeScore(s.overall_score))) : 0);
      
      calculateStreaks();
    }
  }, [sessions]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      
      if (!session?.access_token) {
        navigate('/login');
        return;
      }

      let allSessions: Session[] = [];
      let currentPage = 1;
      const pageSize = 20; // Define page size
      let hasMorePages = true;

      while (hasMorePages) {
        const response = await axios.get(`${API_URL}/scores/combined?page_size=${pageSize}&page=${currentPage}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        console.log(`API Response (Page ${currentPage}):`, response.data);
        
        if (response.data && Array.isArray(response.data)) {
          allSessions = [...allSessions, ...response.data];
          
          // If the number of sessions fetched is less than page_size, it's the last page
          if (response.data.length < pageSize) {
            hasMorePages = false;
          } else {
            currentPage++;
          }
        } else {
          console.error('Invalid response format:', response.data);
          setError('Invalid response format');
          hasMorePages = false; // Stop fetching if format is invalid
        }
      }
      
      console.log('All sessions count after pagination:', allSessions.length);
      setSessions(allSessions);
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

    // --- Calculate Current Streak ---
    const sessionsNewestFirst = [...sessions].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // Newest first
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
          // Session on the same day, streak continues, day doesn't change for count
          continue;
        } else {
          // Streak is broken
          break;
        }
      }
    }
    setCurrentStreak(calculatedCurrentStreak);

    // --- Calculate Longest Streak ---
    const sessionsOldestFirst = [...sessions].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime() // Oldest first
    );

    let calculatedLongestStreak = 0;
    if (sessionsOldestFirst.length > 0) {
      calculatedLongestStreak = 1; // Minimum longest streak is 1 if any session exists
      let tempStreakForLongest = 1;
      let prevDayForLongestNormalized = new Date(sessionsOldestFirst[0].created_at);
      prevDayForLongestNormalized.setHours(0, 0, 0, 0);

      for (let i = 1; i < sessionsOldestFirst.length; i++) {
        const currentDayForLongestNormalized = new Date(sessionsOldestFirst[i].created_at);
        currentDayForLongestNormalized.setHours(0, 0, 0, 0);

        const diffTime = currentDayForLongestNormalized.getTime() - prevDayForLongestNormalized.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) { // Consecutive day
          tempStreakForLongest++;
        } else if (diffDays > 1) { // Gap in days
          calculatedLongestStreak = Math.max(calculatedLongestStreak, tempStreakForLongest);
          tempStreakForLongest = 1; // Reset for new streak starting with currentDayForLongestNormalized
        } else if (diffDays === 0) { // Same day
          // Do nothing, tempStreakForLongest carries over, this session is part of the same day's activity.
        } else { // diffDays < 0 (should not happen with oldestFirst sort) or other unexpected diff
          calculatedLongestStreak = Math.max(calculatedLongestStreak, tempStreakForLongest);
          tempStreakForLongest = 1; // Reset
        }
        prevDayForLongestNormalized = new Date(currentDayForLongestNormalized.getTime());
      }
      calculatedLongestStreak = Math.max(calculatedLongestStreak, tempStreakForLongest); // Final check for the last streak
    }
    setLongestStreak(calculatedLongestStreak);
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
  console.log('Full sessions array length before calculation:', sessions.length);
  const totalSessions = sessions.length;
  console.log('Total sessions calculated:', totalSessions);
  const sessionsChange = "+17%"; // This would be calculated based on previous period
  
  // Filter data based on the selected time interval
  const filterDataByTimeInterval = (data: Session[]): Session[] => {
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
        return data; // Return all data
      default:
        filterDate.setDate(now.getDate() - 7); // Default to 1W
    }
    
    return data.filter(session => new Date(session.created_at) >= filterDate);
  };

  // Apply time interval filter to sessions
  const filteredSessions = filterDataByTimeInterval(sessions);

  // Calculate average scores based on filtered sessions
  const averageScores = filteredSessions.length > 0 ? {
    speech: filteredSessions.reduce((acc, curr) => acc + normalizeScore(curr.speech_score), 0) / filteredSessions.length,
    visual: filteredSessions.reduce((acc, curr) => acc + normalizeScore(curr.visual_score), 0) / filteredSessions.length,
    overall: filteredSessions.reduce((acc, curr) => acc + normalizeScore(curr.overall_score), 0) / filteredSessions.length
  } : { speech: 0, visual: 0, overall: 0 };
  
  
  // Score distribution data
  useEffect(() => {
    if (sessions.length === 0) return;

    // Filter sessions based on time interval
    const timeFilteredSessions = filterDataByTimeInterval(sessions);

    // Get the recent sessions for comparison
    const recentSortedSessions = [...timeFilteredSessions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log("Recent 5 sessions:", recentSortedSessions.slice(0, 5).map(s => {
      const normalizedScore = normalizeScore(s.overall_score);
      return {
        id: s.id,
        overall: s.overall_score,
        normalizedScore,
        speech: s.speech_score,
        visual: s.visual_score,
        created: new Date(s.created_at).toLocaleDateString(),
        category: normalizedScore < 3 
          ? "Poor" 
          : (normalizedScore >= 3 && normalizedScore < 4 
            ? "Average" 
            : (normalizedScore >= 4 
              ? "Good" 
              : "Unknown"))
      };
    }));
    
    // Log detailed information about all sessions
    console.log("Filtered sessions data count:", timeFilteredSessions.length);
    
    // Make sure we handle missing or invalid scores
    const validSessions = timeFilteredSessions.filter(s => {
      const score = normalizeScore(s.overall_score);
      return !isNaN(score);
    });
    
    if (validSessions.length !== timeFilteredSessions.length) {
      console.warn(`Warning: Found ${timeFilteredSessions.length - validSessions.length} sessions with invalid scores`);
    }
    
    // More explicit categorization for better debugging
    // Use normalizeScore to ensure proper numerical comparison
    const poorSessions = validSessions.filter(s => {
      const score = normalizeScore(s.overall_score);
      return score < 3; // Poor is less than 3
    });
    
    const averageSessions = validSessions.filter(s => {
      const score = normalizeScore(s.overall_score);
      return score >= 3 && score < 4; // Average is 3 to less than 4
    });
    
    const goodSessions = validSessions.filter(s => {
      const score = normalizeScore(s.overall_score);
      return score >= 4; // Good is 4 and above
    });
    
    console.log(`Poor sessions (${poorSessions.length}):`, poorSessions.map(s => ({
      id: s.id, 
      score: s.overall_score,
      normalizedScore: normalizeScore(s.overall_score),
      scoreType: typeof s.overall_score
    })));
    console.log(`Average sessions (${averageSessions.length}):`, averageSessions.map(s => ({
      id: s.id, 
      score: s.overall_score,
      normalizedScore: normalizeScore(s.overall_score),
      scoreType: typeof s.overall_score
    })));
    console.log(`Good sessions (${goodSessions.length}):`, goodSessions.map(s => ({
      id: s.id, 
      score: s.overall_score,
      normalizedScore: normalizeScore(s.overall_score),
      scoreType: typeof s.overall_score
    })));
    
    // Calculate counts for each score category
    const poorCount = poorSessions.length;
    const averageCount = averageSessions.length;
    const goodCount = goodSessions.length;
    
    console.log("Category counts:", { poorCount, averageCount, goodCount, total: validSessions.length });
    
    // Ensure the total is correct
    const total = poorCount + averageCount + goodCount;
    if (total !== validSessions.length) {
      console.warn(`Warning: Categorized total ${total} doesn't match valid session count ${validSessions.length}`);
      
      // Find sessions that don't fit into any category
      const categorizedIds = new Set([
        ...poorSessions.map(s => s.id),
        ...averageSessions.map(s => s.id),
        ...goodSessions.map(s => s.id)
      ]);
      
      const uncategorizedSessions = validSessions.filter(s => !categorizedIds.has(s.id));
      
      if (uncategorizedSessions.length > 0) {
        console.warn("Uncategorized sessions:", uncategorizedSessions.map(s => {
          const score = normalizeScore(s.overall_score);
          return {
            id: s.id,
            score: s.overall_score,
            normalizedScore: score,
            scoreType: typeof s.overall_score,
            isPoor: score < 3,
            isAverage: score >= 3 && score < 4,
            isGood: score >= 4
          };
        }));
      }
    }
    
    // Update counts for the legend
    setCategoryCount({
      poor: poorCount,
      average: averageCount,
      good: goodCount
    });
    
    // Update category data for the pie chart
    setCategoryData([
      { name: 'Poor (<3)', value: poorCount, color: '#ff5252' },
      { name: 'Average (3)', value: averageCount, color: '#ffca28' },
      { name: 'Good (≥4)', value: goodCount, color: '#4caf50' }
    ]);
    
    // Update window object for other components that might use it
    (window as any).scoreChartData = [
      { name: 'Poor (<3)', value: poorCount },
      { name: 'Average (3)', value: averageCount },
      { name: 'Good (≥4)', value: goodCount }
    ];
  }, [sessions, timeInterval]);
  
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
    .map(s => ({
      date: new Date(s.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }), // Format as MM/DD
      speechScore: s.speech_score,
      visualScore: s.visual_score,
      overallScore: s.overall_score
    }));
    
  // Log data for debugging
  console.log("Original Sessions Length:", sessions.length);
  console.log("Filtered Sessions Length:", filteredSessions.length);
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
              Dashboard
            </h1>
            <button
              onClick={() => signOut()}
              className="text-white hover:text-gray-100 transition-colors"
            >
              Sign Out
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
          <div className="grid grid-cols-12 gap-2 h-full p-1 max-h-[calc(100vh-40px)]">
            {/* Left Column - All info in one container */}
            <div className="col-span-4 flex flex-col overflow-auto">
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
                      <div className="text-gray-500">Best Score</div>
                      <div className="text-lg font-bold">
                        {sessions.length > 0 ? Math.max(...sessions.map(s => normalizeScore(s.overall_score))).toFixed(1) : '0.0'}
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
              </div>
            </div>
            
            {/* Right Column - Chart */}
            <div className="col-span-8 flex flex-col">
              <div className={`p-2 flex-1 border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-50px)] overflow-hidden flex flex-col`}>
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
                <div className="flex-1 min-h-0">
                  {chartMode === 'scores' ? (
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
                  ) : chartMode === 'activity' ? (
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