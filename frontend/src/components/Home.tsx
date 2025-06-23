import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Sun, Moon, History, ArrowRight, Search, Star, LineChart, ChevronLeft, ChevronRight, HelpCircle, LayoutDashboard, Heart } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import mainLogo from '../assets/logo/logo.svg';
import NewUserTutorial from './Tutorial/NewUserTutorial';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { preferences } = useUserPreferences();
  const { session, user, signOut } = useAuth();

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        if (!session) {
          navigate('/login');
          return;
        }

        const { data, error } = await supabase
          .from('scenarios')
          .select('*');

        if (error) throw error;

        const transformedScenarios = data.map((scenario: any) => ({
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
        setMessage('Error loading scenarios. Please try again.');
      }
    };

    fetchScenarios();
  }, [session, navigate]);

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
      await signOut();
      navigate('/login');
    } catch (error) {
      // Error handling without console.log
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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  const handleDonate = () => {
    window.open('https://buy.stripe.com/3cI5kvahNbr76dg0USg7e00', '_blank');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {showTutorial && <NewUserTutorial onComplete={handleTutorialComplete} />}
      
      {/* Mobile Navigation Bar - Only visible on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#235390] text-white p-4 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img 
              src={mainLogo} 
              alt="RealTalk Coach Logo" 
              className="w-8 h-auto"
            />
            <span className="text-lg font-bold text-white">FIDUPIA</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="text-white hover:bg-[#1a3d6b] rounded-full p-2 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={handleSignOut}
              className="text-white hover:bg-[#1a3d6b] rounded-full p-2 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Hidden on mobile, visible on desktop */}
        <aside className={`hidden md:flex fixed top-0 left-0 ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-[#235390] text-white min-h-screen p-4 flex-col transition-all duration-300`}>
          <div className={`mb-8 ${sidebarCollapsed ? 'flex flex-col items-center space-y-4' : 'flex justify-start items-center w-full'}`}>
            <div className={`flex ${sidebarCollapsed ? 'justify-center' : 'items-center space-x-2'}`}>
              <img 
                src={mainLogo} 
                alt="RealTalk Coach Logo" 
                className="w-9 md:w-11 lg:w-11 h-auto"
              />
              {!sidebarCollapsed && (
                <span className="text-xl font-bold text-white">FIDUPIA</span>
              )}
            </div>
            <button 
              onClick={toggleSidebar}
              className={`${sidebarCollapsed ? '' : 'ml-auto'} text-white hover:bg-[#1a3d6b] rounded-full p-1 transition-colors focus:outline-none`}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="space-y-4">
            <button 
              onClick={() => navigate('/profile')}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-2'} w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors`}
            >
              <User className="w-5 h-5" />
              {!sidebarCollapsed && <span>Profile</span>}
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-2'} w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors`}
            >
              <LayoutDashboard className="w-5 h-5" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </button>
            <button 
              onClick={() => navigate('/scores')}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-2'} w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors`}
            >
              <History className="w-5 h-5" />
              {!sidebarCollapsed && <span>History</span>}
            </button>
            <button 
              onClick={() => setShowTutorial(true)}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-2'} w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors`}
            >
              <HelpCircle className="w-5 h-5" />
              {!sidebarCollapsed && <span>Replay Tutorial</span>}
            </button>
            <button 
              onClick={handleDonate}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-2'} w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors`}
            >
              <Heart className="w-5 h-5" />
              {!sidebarCollapsed && <span>Support Us</span>}
            </button>
          </nav>

          {/* Bottom Actions - Fixed at bottom */}
          <div className="mt-auto space-y-4">
            <button
              onClick={toggleTheme}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-2'} w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors`}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-5 h-5" />
                  {!sidebarCollapsed && <span>Light Mode</span>}
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5" />
                  {!sidebarCollapsed && <span>Dark Mode</span>}
                </>
              )}
            </button>
            <button
              onClick={handleSignOut}
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-2'} w-full p-2 hover:bg-[#1a3d6b] rounded transition-colors`}
            >
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} flex-1 p-4 md:p-8 pt-20 md:pt-8 pb-20 md:pb-8`}>
          <div className="mb-6 md:mb-8">
            <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Practice Scenarios</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search scenarios..."
                value={searchTerm}
                onChange={handleSearch}
                className={`w-full px-4 py-3 pl-10 pr-4 rounded-lg border ${
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
            <div className="mb-8 md:mb-12">
              <div className="flex items-center space-x-2 mb-4 md:mb-6">
                <Star className={`w-5 h-5 md:w-6 md:h-6 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                <h3 className={`text-xl md:text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Recommended for You
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
            <h3 className={`text-xl md:text-2xl font-semibold mb-4 md:mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              All Scenarios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t p-2 z-50`}>
        <div className="flex justify-around">
          <button 
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center p-2 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#235390]'} transition-colors`}
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs">Profile</span>
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className={`flex flex-col items-center p-2 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#235390]'} transition-colors`}
          >
            <LayoutDashboard className="w-5 h-5 mb-1" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button 
            onClick={() => navigate('/scores')}
            className={`flex flex-col items-center p-2 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#235390]'} transition-colors`}
          >
            <History className="w-5 h-5 mb-1" />
            <span className="text-xs">History</span>
          </button>
          <button 
            onClick={() => setShowTutorial(true)}
            className={`flex flex-col items-center p-2 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#235390]'} transition-colors`}
          >
            <HelpCircle className="w-5 h-5 mb-1" />
            <span className="text-xs">Help</span>
          </button>
          <button 
            onClick={handleDonate}
            className={`flex flex-col items-center p-2 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#235390]'} transition-colors`}
          >
            <Heart className="w-5 h-5 mb-1" />
            <span className="text-xs">Support</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ScenarioCardProps {
  scenario: Scenario;
  isDarkMode: boolean;
  onSelect: (scenario: Scenario) => void;
}

// Scenario Card Component
const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, isDarkMode, onSelect }) => (
  <div
    className={`rounded-lg shadow-md p-4 md:p-6 hover:shadow-lg transition-shadow border ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } flex flex-col min-h-[280px] md:min-h-[300px]`}
  >
    <div className="flex justify-between items-start gap-3 mb-3 md:mb-4">
      <h3 className={`text-lg md:text-xl font-semibold line-clamp-2 md:line-clamp-none ${
        isDarkMode ? 'text-white' : 'text-gray-800'
      }`}>{scenario.title}</h3>
      <span className="px-2 py-1 text-xs md:text-sm bg-[#4CAF50] text-white rounded-xl whitespace-nowrap flex-shrink-0">
        {scenario.category}
      </span>
    </div>
    
    <p className={`flex-grow text-sm md:text-base line-clamp-4 md:line-clamp-none ${
      isDarkMode ? 'text-gray-300' : 'text-gray-600'
    }`}>{scenario.description}</p>

    <div className={`flex justify-between items-center pt-3 md:pt-4 border-t mt-3 md:mt-4 ${
      isDarkMode ? 'border-gray-700' : 'border-gray-100'
    }`}>
      <span className={`text-xs md:text-sm ${
        isDarkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>Difficulty: {scenario.difficulty}</span>
      <button
        onClick={() => onSelect(scenario)}
        className="bg-[#4CAF50] text-white rounded-full text-xs md:text-sm font-semibold px-2 md:px-4 py-2 flex items-center hover:bg-[#3d8b40] transition-colors"
      >
        Start Practice
        <ArrowRight className="ml-1 md:ml-2 w-3 h-3" />
      </button>
    </div>
  </div>
);

export default Home;
