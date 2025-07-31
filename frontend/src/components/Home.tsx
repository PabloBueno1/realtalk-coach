import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, History, ArrowRight, Search, Star, LineChart, ChevronLeft, ChevronRight, ChevronDown, HelpCircle, Coins } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
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


  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [accountTier, setAccountTier] = useState<string | null>(null);
  const [monthlyTokens, setMonthlyTokens] = useState<number | null>(null);
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
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
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('tier, monthly_tokens')
        .eq('id', user.id)
        .single();
      if (error) {
        // Optionally handle error
        return;
      }
      setAccountTier(data.tier);
      setMonthlyTokens(data.monthly_tokens);
    };
    fetchProfile();
  }, [user]);

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
    let filtered = scenarios;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchTermLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(scenario =>
        (scenario.title?.toLowerCase() || '').includes(searchTermLower) ||
        (scenario.description?.toLowerCase() || '').includes(searchTermLower) ||
        (scenario.category?.toLowerCase() || '').includes(searchTermLower)
      );
    }

    // Apply multiple filters
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(scenario => {
        return selectedFilters.every(filter => {
          const [filterType, filterValue] = filter.split(':');
          if (filterType === 'category') {
            return scenario.category === filterValue;
          } else if (filterType === 'difficulty') {
            return scenario.difficulty === filterValue;
          }
          return true;
        });
      });
    }
    
    setFilteredScenarios(filtered);
  }, [searchTerm, scenarios, selectedFilters]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters([]);
  };

  // Get unique categories and difficulties for filter options
  const uniqueCategories = Array.from(new Set(scenarios.map(s => s.category))).sort();
  const uniqueDifficulties = Array.from(new Set(scenarios.map(s => s.difficulty))).sort();



  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  const handleUpgrade = () => {
    // Stripe Payment Link for Pro plan (20 tokens)
    window.open('https://buy.stripe.com/bJebITdtZgLr9ps8nkg7e01', '_blank');
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
        <aside className="hidden md:flex fixed top-0 left-0 w-64 bg-[#235390] text-white min-h-screen p-4 flex-col">
          <div className="mb-8 flex justify-start items-center w-full">
            <div className="flex items-center space-x-2">
              <img 
                src={mainLogo} 
                alt="RealTalk Coach Logo" 
                className="w-9 md:w-11 lg:w-11 h-auto"
              />
              <span className="text-xl font-bold text-white">FIDUPIA</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-3">
            {accountTier === 'pro' ? (
              <button
                disabled
                className="flex items-center justify-between w-full p-3 bg-[#4CAF50] text-white rounded-lg transition-colors cursor-default"
              >
                <span className="flex items-center">
                  <Star className="w-5 h-5" />
                  <span className="ml-3">Pro Account</span>
                </span>
                <span className="flex items-center bg-green-700 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  <Coins className="w-4 h-4 mr-1" />
                  {monthlyTokens ?? '...'}
                </span>
              </button>
            ) : (
              <button 
                onClick={handleUpgrade}
                className="flex items-center justify-between w-full p-3 hover:bg-[#1a3d6b] rounded-lg transition-colors"
              >
                <span className="flex items-center">
                  <Star className="w-5 h-5" />
                  <span className="ml-3">Upgrade to Pro</span>
                </span>
                <span className="flex items-center bg-green-700 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  <Coins className="w-4 h-4 mr-1" />
                  {monthlyTokens ?? '...'}
                </span>
              </button>
            )}
            <button 
              onClick={() => navigate('/scores')}
              className="flex items-center space-x-3 w-full p-3 hover:bg-[#1a3d6b] rounded-lg transition-colors"
            >
              <History className="w-5 h-5" />
              <span>History</span>
            </button>
          </nav>

          {/* Bottom Actions - Fixed at bottom */}
          <div className="mt-auto space-y-3">
            <button 
              onClick={() => setShowTutorial(true)}
              className="flex items-center space-x-3 w-full p-3 hover:bg-[#1a3d6b] rounded-lg transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Help</span>
            </button>
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-3 w-full p-3 hover:bg-[#1a3d6b] rounded-lg transition-colors"
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
              className="flex items-center space-x-3 w-full p-3 hover:bg-[#1a3d6b] rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="transition-all duration-300 md:ml-64 flex-1 p-4 md:p-8 pt-20 md:pt-8 pb-24 md:pb-8">
          <div className="mb-6 md:mb-8">
            <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-6`}>Practice Scenarios</h2>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              {/* Search Bar */}
              <div className="relative flex-1">
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
                } pointer-events-none`} />
              </div>

              {/* Multi-Select Filter Widget */}
              <div className="md:w-64 relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-between ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white hover:border-[#4CAF50] focus:border-[#4CAF50]' 
                      : 'bg-white border-gray-300 text-gray-700 hover:border-[#4CAF50] focus:border-[#4CAF50]'
                  } focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:ring-opacity-50`}
                >
                  <span className="flex items-center space-x-2">
                    <LineChart className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {selectedFilters.length === 0 
                        ? 'Filter Scenarios' 
                        : `${selectedFilters.length} filter${selectedFilters.length !== 1 ? 's' : ''}`
                      }
                    </span>
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showFilterDropdown && (
                  <div className={`absolute top-full left-0 right-0 mt-1 rounded-lg border-2 shadow-lg z-50 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="p-4 space-y-4">
                      {/* Categories Section */}
                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          Categories
                        </h4>
                        <div className="space-y-2">
                          {uniqueCategories.map(category => {
                            const filterValue = `category:${category}`;
                            const isSelected = selectedFilters.includes(filterValue);
                            return (
                              <label
                                key={filterValue}
                                className={`flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-colors ${
                                  isSelected 
                                    ? (isDarkMode ? 'bg-[#4CAF50] bg-opacity-20' : 'bg-[#4CAF50] bg-opacity-10')
                                    : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleFilter(filterValue)}
                                  className={`w-4 h-4 rounded ${
                                    isDarkMode 
                                      ? 'bg-gray-700 border-gray-600 text-[#4CAF50] focus:ring-[#4CAF50]' 
                                      : 'bg-white border-gray-300 text-[#4CAF50] focus:ring-[#4CAF50]'
                                  }`}
                                />
                                <span className={`text-sm ${
                                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  {category}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Difficulties Section */}
                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          Difficulties
                        </h4>
                        <div className="space-y-2">
                          {uniqueDifficulties.map(difficulty => {
                            const filterValue = `difficulty:${difficulty}`;
                            const isSelected = selectedFilters.includes(filterValue);
                            return (
                              <label
                                key={filterValue}
                                className={`flex items-center space-x-2 cursor-pointer p-2 rounded-md transition-colors ${
                                  isSelected 
                                    ? (isDarkMode ? 'bg-[#4CAF50] bg-opacity-20' : 'bg-[#4CAF50] bg-opacity-10')
                                    : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleFilter(filterValue)}
                                  className={`w-4 h-4 rounded ${
                                    isDarkMode 
                                      ? 'bg-gray-700 border-gray-600 text-[#4CAF50] focus:ring-[#4CAF50]' 
                                      : 'bg-white border-gray-300 text-[#4CAF50] focus:ring-[#4CAF50]'
                                  }`}
                                />
                                <span className={`text-sm ${
                                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  {difficulty}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* All Scenarios Section */}
          <div>
            <h3 className={`text-xl md:text-2xl font-semibold mb-4 md:mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {searchTerm || selectedFilters.length > 0 ? 'All Scenarios' : 'All Scenarios'}
            </h3>
            {filteredScenarios.length === 0 ? (
              <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Search className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className="text-lg font-medium">No results found</p>
                <p className="text-sm mt-2">
                  Try adjusting your search terms or filters
                </p>
              </div>
            ) : (
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
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t p-3 z-50`}>
        <div className="flex justify-between items-center px-2">
          {accountTier === 'pro' ? (
            <button
              disabled
              className={`flex flex-col items-center p-3 bg-[#4CAF50] text-white rounded-lg transition-colors cursor-default min-w-[80px]`}
            >
              <div className="flex items-center space-x-1 mb-1">
                <Coins className="w-4 h-4" />
                <span className="bg-green-700 text-white text-xs font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                  {monthlyTokens ?? '...'}
                </span>
              </div>
              <span className="text-xs font-medium">Pro</span>
            </button>
          ) : (
            <button 
              onClick={handleUpgrade}
              className={`flex flex-col items-center p-3 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#235390]'} transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[80px]`}
            >
              <div className="flex items-center space-x-1 mb-1">
                <Coins className="w-4 h-4" />
                <span className="bg-green-700 text-white text-xs font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                  {monthlyTokens ?? '...'}
                </span>
              </div>
              <span className="text-xs font-medium">Upgrade</span>
            </button>
          )}
          
          <button 
            onClick={() => navigate('/scores')}
            className={`flex flex-col items-center p-3 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#235390]'} transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[80px]`}
          >
            <History className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">History</span>
          </button>
          
          <button 
            onClick={() => setShowTutorial(true)}
            className={`flex flex-col items-center p-3 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-[#235390]'} transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[80px]`}
          >
            <HelpCircle className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Help</span>
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
