import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, User, Sun, Moon, BookOpen, BarChart2, ArrowRight } from 'lucide-react';

interface Scenario {
  id: number;
  title: string;
  description: string;
  bulletPoints: string[];
  difficulty: string;
  category: string;
}

const Home: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        setScenarios([
          {
            id: 1,
            title: "Software Technical Interview",
            description: "Practice for a technical interview in the software development field.",
            bulletPoints: [
              "Review common coding questions",
              "Discuss your project experience",
              "Explain technical concepts clearly",
              "Demonstrate problem-solving skills"
            ],
            difficulty: "Advanced",
            category: "Professional"
          },
          {
            id: 2,
            title: "Casual Friend Chat",
            description: "Practice everyday casual conversation with friends.",
            bulletPoints: [
              "Share personal experiences",
              "Maintain engaging conversation flow",
              "Practice active listening",
              "Use appropriate casual language"
            ],
            difficulty: "Beginner",
            category: "Social Skills"
          }
        ]);
      } catch (error) {
        console.error('Error setting scenarios:', error);
        setMessage('Error loading scenarios. Please try again.');
        setIsSuccess(false);
      }
    };

    fetchScenarios();
  }, []);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.add('dark');
      htmlElement.style.backgroundColor = '#252525';
      document.body.style.backgroundColor = '#252525';
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.style.backgroundColor = '#ffffff';
      document.body.style.backgroundColor = '#ffffff';
    }

    htmlElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    localStorage.setItem('darkMode', isDarkMode.toString());

    return () => {
      htmlElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const handleSignOut = async () => {
    try {
      await axios.post('http://localhost:8000/auth/signout');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setMessage('Successfully signed out. Redirecting...');
      setIsSuccess(true);
      const messageElement = document.getElementById('signout-message');
      if (messageElement) {
        messageElement.classList.add('animate-fade-in');
      }
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      setMessage('Error signing out. Please try again.');
      setIsSuccess(false);
    }
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    const formattedScenario = {
      id: scenario.id.toString(),
      title: scenario.title,
      description: scenario.description,
      initial_prompt: "",
      context: scenario.bulletPoints.join("\n"),
      difficulty_level: scenario.difficulty
    };
    navigate(`/practice/${scenario.id}`, {
      state: { selectedScenario: formattedScenario }
    });
  };

  return (
    <>
      <div className={`flex h-screen ${isDarkMode ? 'bg-[#252525]' : 'bg-white'}`}>
        {/* Left Sidebar */}
        <aside className={`w-64 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-gray-100'} shadow-md flex flex-col`}>
          <div className={`p-4 border-b ${isDarkMode ? 'border-[#333333]' : 'border-gray-200'}`}>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Fidupia</h2>
          </div>

          <nav className="flex-grow p-4">
            <ul className="flex flex-col space-y-4">
              <li>
                <a href="#" className={`flex items-center p-2 ${isDarkMode ? 'text-gray-300 hover:bg-[#252525]' : 'text-gray-800 hover:bg-gray-200'} rounded`}>
                  <BookOpen className="w-5 h-5 mr-2" /> Learn
                </a>
              </li>
              <li>
                <a href="#" className={`flex items-center p-2 ${isDarkMode ? 'text-gray-300 hover:bg-[#252525]' : 'text-gray-800 hover:bg-gray-200'} rounded`}>
                  <User className="w-5 h-5 mr-2" /> Profile
                </a>
              </li>
              <li>
                <a href="#" className={`flex items-center p-2 ${isDarkMode ? 'text-gray-300 hover:bg-[#252525]' : 'text-gray-800 hover:bg-gray-200'} rounded`}>
                  <BarChart2 className="w-5 h-5 mr-2" /> Scores
                </a>
              </li>
            </ul>
          </nav>

          <div className={`p-4 border-t ${isDarkMode ? 'border-[#333333]' : 'border-gray-200'} flex flex-col space-y-2`}>
            <button
              onClick={toggleTheme}
              className={`px-6 py-2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-[#252525]' : 'text-gray-800 hover:text-gray-900 hover:bg-gray-200'} transition-colors border-l border-r ${isDarkMode ? 'border-[#333333]' : 'border-gray-200'} flex items-center justify-center`}
              type="button"
            >
              {isDarkMode ? <Sun size={20} className="mr-2" /> : <Moon size={20} className="mr-2" />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            <button
              onClick={handleSignOut}
              className={`px-6 py-2 ${isDarkMode ? 'text-red-400 hover:text-red-300 hover:bg-[#252525]' : 'text-red-600 hover:text-red-700 hover:bg-gray-200'} transition-colors border-l border-r ${isDarkMode ? 'border-[#333333]' : 'border-gray-200'} flex items-center justify-center`}
              type="button"
            >
              <LogOut size={20} className="mr-2" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 ${isDarkMode ? 'bg-[#252525]' : 'bg-white'}`}>
          <div className="h-full overflow-y-auto p-8">
            {message && (
              <div className={`message ${isSuccess ? 'success' : 'error'} mb-6 absolute top-4 left-1/2 transform -translate-x-1/2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {message}
              </div>
            )}

            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>Practice Scenarios</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className={`${isDarkMode ? 'bg-[#1a1a1a] hover:bg-[#252525]' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg p-6 transition-colors`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{scenario.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-[#252525] text-gray-300' : 'bg-gray-200 text-gray-800'}`}>{scenario.category}</span>
                      </div>
                      <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>{scenario.description}</p>
                      <ul className={`text-sm mb-4 space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>
                        {scenario.bulletPoints.map((point, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-between items-center mt-4">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-800'}`}>Difficulty: {scenario.difficulty}</span>
                        <button 
                          onClick={() => handleScenarioSelect(scenario)}
                          className="cssbuttons-io"
                          style={{ cursor: 'pointer' }}
                        >
                          <span>
                            Start
                            <ArrowRight />
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Home;
