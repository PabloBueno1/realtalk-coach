import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, History, ArrowRight, Search, Star, LineChart, ChevronLeft, ChevronRight, ChevronDown, HelpCircle, Coins, Briefcase, Target, Award, Lock, Sparkles, Loader2, AlertCircle } from 'lucide-react';
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
  const [freeScenarios, setFreeScenarios] = useState<Scenario[]>([]);
  const [proScenarios, setProScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showTutorial, setShowTutorial] = useState(false);
  const [accountTier, setAccountTier] = useState<string | null>(null);
  const [monthlyTokens, setMonthlyTokens] = useState<number | null>(null);
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { session, user, signOut } = useAuth();

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
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
        
        // Separate free and pro scenarios
        const free = transformedScenarios.filter(s => 
          // Only these 3 exact scenarios are free
          s.title.toLowerCase() === 'job interview' ||
          s.title.toLowerCase() === 'elevator pitch' ||
          s.title.toLowerCase() === 'pharmacy otc recommendation'
        ).sort((a, b) => {
          // Sort to put Job Interview first, then Elevator Pitch, then Pharmacy
          if (a.title.toLowerCase() === 'job interview') return -1;
          if (b.title.toLowerCase() === 'job interview') return 1;
          if (a.title.toLowerCase() === 'elevator pitch') return -1;
          if (b.title.toLowerCase() === 'elevator pitch') return 1;
          return 0;
        });
        
        const pro = transformedScenarios.filter(s => 
          !free.some(freeScenario => freeScenario.id === s.id)
        );
        
        setFreeScenarios(free);
        setProScenarios(pro);
      } catch (error) {
        setError('Error loading scenarios. Please try again.');
        console.error('Error fetching scenarios:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScenarios();
  }, [session, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('tier, monthly_tokens')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }
        setAccountTier(data.tier);
        setMonthlyTokens(data.monthly_tokens);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
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

  const handleProScenarioClick = () => {
    handleUpgrade();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  const handleUpgrade = () => {
    // Stripe Payment Link for Pro plan (20 tokens)
    window.open('https://buy.stripe.com/bJebITdtZgLr9ps8nkg7e01', '_blank');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'} flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading scenarios...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'} flex items-center justify-center`}>
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
          <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Something went wrong</h2>
          <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDarkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {showTutorial && <NewUserTutorial onComplete={handleTutorialComplete} />}
      
      {/* Mobile Navigation Bar - Only visible on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#235390] text-white p-4 z-50 shadow-lg">
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
        <aside className="hidden md:flex fixed top-0 left-0 w-64 bg-[#235390] text-white min-h-screen p-4 flex-col shadow-xl">
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
                className="flex items-center justify-between w-full p-3 bg-[#4CAF50] text-white rounded-lg transition-colors cursor-default shadow-sm"
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
                className="flex items-center justify-between w-full p-3 hover:bg-[#1a3d6b] rounded-lg transition-colors shadow-sm"
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
          {/* Welcome Message */}
          <div className="mb-8">
            <h1 className={`text-2xl md:text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
            </h1>
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Choose a scenario to start practicing your communication skills
            </p>
          </div>

          {/* Free Practice Scenarios Section */}
          {freeScenarios.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-6">
                <Sparkles className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                <h2 className={`text-xl md:text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Free Practice Scenarios
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeScenarios.map((scenario: Scenario) => (
                  <FreeScenarioCard 
                    key={scenario.id} 
                    scenario={scenario} 
                    isDarkMode={isDarkMode} 
                    onSelect={handleScenarioSelect} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pro Scenarios Section */}
          {proScenarios.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <Star className={`w-6 h-6 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <h2 className={`text-xl md:text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {accountTier === 'pro' ? 'Pro Scenarios' : 'Upgrade to Pro'}
                </h2>
                {accountTier !== 'pro' && (
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    ({proScenarios.length} scenarios available)
                  </span>
                )}
              </div>
              
              {/* Group scenarios by category */}
              {(() => {
                const groupedScenarios = proScenarios.reduce((groups: { [key: string]: Scenario[] }, scenario) => {
                  const category = scenario.category;
                  if (!groups[category]) {
                    groups[category] = [];
                  }
                  groups[category].push(scenario);
                  return groups;
                }, {});

                return Object.entries(groupedScenarios)
                  .sort(([categoryA], [categoryB]) => {
                    // Sort to put Job Interview categories first
                    const aLower = categoryA.toLowerCase();
                    const bLower = categoryB.toLowerCase();
                    if (aLower.includes('job interview') || aLower.includes('interview')) return -1;
                    if (bLower.includes('job interview') || bLower.includes('interview')) return 1;
                    return categoryA.localeCompare(categoryB);
                  })
                  .map(([category, scenarios]) => (
                    <div key={category} className="mb-8">
                      <h3 className={`text-lg md:text-xl font-semibold mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scenarios.map((scenario: Scenario) => (
                          accountTier === 'pro' ? (
                            <FreeScenarioCard 
                              key={scenario.id} 
                              scenario={scenario} 
                              isDarkMode={isDarkMode} 
                              onSelect={handleScenarioSelect} 
                              showFreeBadge={false}
                            />
                          ) : (
                            <ProScenarioCard 
                              key={scenario.id} 
                              scenario={scenario} 
                              isDarkMode={isDarkMode} 
                              onSelect={handleProScenarioClick} 
                            />
                          )
                        ))}
                      </div>
                    </div>
                  ));
              })()}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && freeScenarios.length === 0 && proScenarios.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                No scenarios available
              </h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Check back later for new practice scenarios
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t p-3 z-50 shadow-lg`}>
        <div className="flex justify-between items-center px-2">
          {accountTier === 'pro' ? (
            <button
              disabled
              className={`flex flex-col items-center p-3 bg-[#4CAF50] text-white rounded-lg transition-colors cursor-default min-w-[80px] shadow-sm`}
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
  showFreeBadge?: boolean;
}

// Free Scenario Card Component
const FreeScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, isDarkMode, onSelect, showFreeBadge = true }) => {
  const isJobInterview = scenario.category.toLowerCase().includes('job interview') || 
                        scenario.category.toLowerCase().includes('interview') ||
                        scenario.title.toLowerCase().includes('interview');
  const isElevatorPitch = scenario.title.toLowerCase().includes('elevator pitch') ||
                          scenario.description.toLowerCase().includes('elevator pitch');
  const isPharmacy = scenario.title.toLowerCase().includes('pharmacy') ||
                     scenario.description.toLowerCase().includes('pharmacy') ||
                     scenario.category.toLowerCase().includes('pharmacy');
  
  return (
    <div
      className={`rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-750' 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      } flex flex-col min-h-[320px] relative group cursor-pointer`}
      onClick={() => onSelect(scenario)}
    >
      <div className="flex justify-between items-start gap-3 mb-4">
        <h3 className={`text-xl md:text-2xl font-bold line-clamp-2 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>{scenario.title}</h3>
        
        {/* Free/Pro Badge */}
        {showFreeBadge ? (
          <span className={`px-3 py-1 text-xs font-bold rounded-full flex-shrink-0 ${
            isDarkMode ? 'bg-[#4CAF50] text-white' : 'bg-[#4CAF50] text-white'
          }`}>
            FREE
          </span>
        ) : (
          <span className={`px-3 py-1 text-xs font-bold rounded-full flex-shrink-0 ${
            isDarkMode ? 'bg-yellow-500 text-white' : 'bg-yellow-500 text-white'
          }`}>
            PRO
          </span>
        )}
      </div>
      
      <p className={`flex-grow text-sm md:text-base line-clamp-4 mb-6 ${
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      }`}>{scenario.description}</p>

      <div className={`flex justify-between items-center pt-4 border-t ${
        isDarkMode ? 'border-gray-700' : 'border-gray-100'
      }`}>
        <span className={`text-xs md:text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>Difficulty: {scenario.difficulty}</span>
        <button
          className={`rounded-full text-xs md:text-sm font-semibold px-4 py-2 flex items-center transition-colors ${
            isDarkMode ? 'bg-[#4CAF50] hover:bg-[#3d8b40] text-white' : 'bg-[#4CAF50] hover:bg-[#3d8b40] text-white'
          }`}
        >
          Start Practice
          <ArrowRight className="ml-2 w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// Pro Scenario Card Component
const ProScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, isDarkMode, onSelect }) => {
  const isJobInterview = scenario.category.toLowerCase().includes('job interview') || 
                        scenario.category.toLowerCase().includes('interview') ||
                        scenario.title.toLowerCase().includes('interview');
  const isElevatorPitch = scenario.title.toLowerCase().includes('elevator pitch') ||
                          scenario.description.toLowerCase().includes('elevator pitch');
  
  return (
    <div
      className={`rounded-xl shadow-md p-6 transition-all duration-300 border ${
        isDarkMode 
          ? 'bg-gray-700 border-gray-600' 
          : 'bg-gray-100 border-gray-200'
      } flex flex-col min-h-[320px] relative group cursor-pointer`}
      onClick={() => onSelect(scenario)}
      title="Upgrade to Pro to unlock"
    >
      {/* Semi-transparent overlay */}
      <div className={`absolute inset-0 rounded-xl ${
        isDarkMode ? 'bg-black bg-opacity-40' : 'bg-white bg-opacity-60'
      }`}></div>

      {/* Lock Icon */}
      <div className="absolute top-4 right-4 z-10">
        <Lock className={`w-5 h-5 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`} />
      </div>

      <div className="flex justify-between items-start gap-3 mb-4 relative z-10">
        <h3 className={`text-xl md:text-2xl font-bold line-clamp-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>{scenario.title}</h3>
      </div>
      
      <p className={`flex-grow text-sm md:text-base line-clamp-4 mb-6 ${
        isDarkMode ? 'text-gray-400' : 'text-gray-500'
      } relative z-10`}>{scenario.description}</p>

      <div className={`flex justify-between items-center pt-4 border-t ${
        isDarkMode ? 'border-gray-600' : 'border-gray-200'
      } relative z-10`}>
        <span className={`text-xs md:text-sm ${
          isDarkMode ? 'text-gray-500' : 'text-gray-400'
        }`}>Difficulty: {scenario.difficulty}</span>
        <button
          className={`rounded-full text-xs md:text-sm font-semibold px-4 py-2 flex items-center transition-colors ${
            isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-400 text-gray-600'
          }`}
        >
          Unlock with Pro
          <Lock className="ml-2 w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default Home;
