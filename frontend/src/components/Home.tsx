import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, User, Sun, Moon, BarChart2, ArrowRight, Search, Star } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import welcomeLogo from '../assets/logo/welcome.svg';

const API_URL = process.env.REACT_APP_API_URL;

interface Scenario {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  initial_prompt: string;
  context: string;
  skills: string[];
}

const Home: React.FC = () => {
  const [message, setMessage] = useState('');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredScenarios, setFilteredScenarios] = useState<Scenario[]>([]);
  const [recommendedScenarios, setRecommendedScenarios] = useState<Scenario[]>([]);
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { preferences } = useUserPreferences();

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`${API_URL}/scenarios/scenarios`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const transformedScenarios = response.data.map((scenario: any) => ({
          id: scenario.id,
          title: scenario.title,
          description: scenario.description,
          difficulty: scenario.difficulty_level,
          category: scenario.category,
          initial_prompt: scenario.initial_prompt,
          context: scenario.context,
          skills: scenario.skills || []
        }));

        setScenarios(transformedScenarios);
        setFilteredScenarios(transformedScenarios);
      } catch (error) {
        console.error('Error fetching scenarios:', error);
        setMessage('Error loading scenarios. Please try again.');
      }
    };

    fetchScenarios();
  }, [navigate]);

  useEffect(() => {
    if (preferences && scenarios.length > 0) {
      const recommended = scenarios.filter(scenario => {
        const categoryMatch = preferences.preferredScenarios.includes(scenario.category);
        const goalMatch = scenario.skills.some(skill => 
          preferences.learningGoals.includes(skill)
        );
        return categoryMatch || goalMatch;
      });
      setRecommendedScenarios(recommended);
    }
  }, [preferences, scenarios]);

  const handleScenarioSelect = (scenario: Scenario) => {
    navigate(`/practice/${scenario.id}`, {
      state: { 
        selectedScenario: {
          id: scenario.id.toString(),
          title: scenario.title,
          description: scenario.description,
          initial_prompt: scenario.initial_prompt,
          context: scenario.context,
          difficulty_level: scenario.difficulty,
          category: scenario.category
        }
      }
    });
  };

  const handleSignOut = async () => {
    try {
      await axios.post(`${API_URL}/auth/signout`);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredScenarios(scenarios);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase().trim();
    const filtered = scenarios.filter(scenario =>
      (scenario.title?.toLowerCase() || '').includes(searchTermLower) ||
      (scenario.description?.toLowerCase() || '').includes(searchTermLower) ||
      (scenario.category?.toLowerCase() || '').includes(searchTermLower)
    );
    
    setFilteredScenarios(filtered);
  }, [searchTerm, scenarios]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed top-0 left-0 w-64 bg-[#235390] text-white min-h-screen p-4 flex flex-col">
          <div className="mb-8 flex justify-center items-center">
            <img 
              src={welcomeLogo} 
              alt="RealTalk Coach Logo" 
              className="w-48 h-auto"
            />
          </div>
          
          {/* Navigation */}
          <nav className="space-y-4">
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-2 w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors"
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
            <button 
              onClick={() => navigate('/scores')}
              className="flex items-center space-x-2 w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors"
            >
              <BarChart2 className="w-5 h-5" />
              <span>Scores</span>
            </button>
          </nav>

          {/* Bottom Actions - Fixed at bottom */}
          <div className="mt-auto space-y-4">
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-5 h-5" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="ml-64 flex-1 p-8">
          <div className="mb-8">
            <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Practice Scenarios</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search scenarios..."
                value={searchTerm}
                onChange={handleSearch}
                className={`w-full px-4 py-2 pl-10 pr-4 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:ring-[#4CAF50] focus:border-[#4CAF50]' 
                    : 'border-gray-300 focus:ring-[#4CAF50] focus:border-transparent'
                } focus:outline-none focus:ring-2`}
              />
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-400'
              }`} />
            </div>
          </div>

          {/* Recommended Section */}
          {recommendedScenarios.length > 0 && !searchTerm && (
            <div className="mb-12">
              <div className="flex items-center space-x-2 mb-6">
                <Star className={`w-6 h-6 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                <h3 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Recommended for You
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedScenarios.map((scenario) => (
                  <ScenarioCard 
                    key={scenario.id} 
                    scenario={scenario} 
                    isDarkMode={isDarkMode} 
                    onSelect={handleScenarioSelect} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Scenarios Section */}
          <div>
            <h3 className={`text-2xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              All Scenarios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredScenarios.map((scenario) => (
                <ScenarioCard 
                  key={scenario.id} 
                  scenario={scenario} 
                  isDarkMode={isDarkMode} 
                  onSelect={handleScenarioSelect} 
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

interface ScenarioCardProps {
  scenario: Scenario;
  isDarkMode: boolean;
  onSelect: (scenario: Scenario) => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, isDarkMode, onSelect }) => (
  <div
    className={`rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } flex flex-col h-[300px]`}
  >
    <div className="flex justify-between items-start gap-4 mb-4">
      <h3 className={`text-xl font-semibold ${
        isDarkMode ? 'text-white' : 'text-gray-800'
      }`}>{scenario.title}</h3>
      <span className="px-2 py-1 text-sm bg-[#4CAF50] text-white rounded whitespace-nowrap flex-shrink-0">
        {scenario.category}
      </span>
    </div>
    
    <p className={`flex-grow overflow-auto ${
      isDarkMode ? 'text-gray-300' : 'text-gray-600'
    }`}>{scenario.description}</p>

    <div className={`flex justify-between items-center pt-4 border-t ${
      isDarkMode ? 'border-gray-700' : 'border-gray-100'
    }`}>
      <span className={`text-sm ${
        isDarkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>Difficulty: {scenario.difficulty}</span>
      <button
        onClick={() => onSelect(scenario)}
        className="bg-[#4CAF50] text-white px-4 py-2 rounded hover:bg-[#45a049] transition-colors flex items-center"
      >
        Start Practice
        <ArrowRight className="ml-2 w-4 h-4" />
      </button>
    </div>
  </div>
);

export default Home;
