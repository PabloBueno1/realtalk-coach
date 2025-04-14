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
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: 1,
      title: "Basic Conversation",
      description: "Practice fundamental conversation skills in a casual setting with a friendly AI companion.",
      bulletPoints: [
        "Learn proper greeting etiquette",
        "Practice active listening techniques",
        "Develop natural response patterns",
        "Master small talk scenarios"
      ],
      difficulty: "Beginner",
      category: "Social Skills"
    },
    {
      id: 2,
      title: "Job Interview Preparation",
      description: "Prepare for job interviews with realistic scenarios and common interview questions.",
      bulletPoints: [
        "Handle behavioral questions confidently",
        "Practice discussing your experience",
        "Learn salary negotiation tactics",
        "Master the STAR response method"
      ],
      difficulty: "Intermediate",
      category: "Professional"
    },
    {
      id: 3,
      title: "Conflict Resolution",
      description: "Learn to handle workplace conflicts and difficult conversations professionally.",
      bulletPoints: [
        "De-escalate tense situations",
        "Practice empathetic listening",
        "Find win-win solutions",
        "Maintain professional boundaries"
      ],
      difficulty: "Advanced",
      category: "Professional"
    },
    {
      id: 4,
      title: "Public Speaking",
      description: "Build confidence in public speaking through structured practice sessions.",
      bulletPoints: [
        "Overcome speaking anxiety",
        "Improve voice projection",
        "Structure presentations effectively",
        "Handle Q&A sessions"
      ],
      difficulty: "Intermediate",
      category: "Communication"
    },
    {
      id: 5,
      title: "Customer Service Excellence",
      description: "Master customer service interactions with challenging scenarios and best practices.",
      bulletPoints: [
        "Handle customer complaints effectively",
        "Provide solutions proactively",
        "Maintain professional composure",
        "Exceed customer expectations"
      ],
      difficulty: "Intermediate",
      category: "Professional"
    },
    {
      id: 6,
      title: "Networking Event",
      description: "Practice networking skills in a simulated professional event environment.",
      bulletPoints: [
        "Make memorable introductions",
        "Exchange contact information naturally",
        "Follow up effectively",
        "Build meaningful connections"
      ],
      difficulty: "Beginner",
      category: "Social Skills"
    },
    {
      id: 7,
      title: "Sales Pitch",
      description: "Perfect your sales pitch and persuasion skills in various business contexts.",
      bulletPoints: [
        "Craft compelling value propositions",
        "Handle objections smoothly",
        "Close deals professionally",
        "Build long-term relationships"
      ],
      difficulty: "Advanced",
      category: "Professional"
    },
    {
      id: 8,
      title: "Team Leadership",
      description: "Develop essential leadership skills through realistic team management scenarios.",
      bulletPoints: [
        "Lead team meetings effectively",
        "Provide constructive feedback",
        "Delegate tasks appropriately",
        "Build team motivation"
      ],
      difficulty: "Advanced",
      category: "Leadership"
    },
    {
      id: 9,
      title: "Cultural Sensitivity",
      description: "Learn to navigate cross-cultural communication in a global workplace.",
      bulletPoints: [
        "Understand cultural differences",
        "Avoid common cultural faux pas",
        "Practice inclusive communication",
        "Build international relationships"
      ],
      difficulty: "Intermediate",
      category: "Social Skills"
    }
  ]);
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });

  // Fetch scenarios when component mounts
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        // Skip actual API call and directly set the two required scenarios
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

  // Apply theme class and background color to <html> element
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
    
    // Prevent scrolling on html and body
    htmlElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    
    localStorage.setItem('darkMode', isDarkMode.toString());
    
    return () => {
      // Clean up when component unmounts
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
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (error) {
      setMessage('Error signing out. Please try again.');
      setIsSuccess(false);
    }
  };

  // Function to handle scenario selection
  const handleScenarioSelect = (scenario: Scenario) => {
    console.log("Start button clicked for scenario:", scenario.title);
    
    // Convert scenario and bulletPoints to match the format expected by ConversationPractice
    const formattedScenario = {
      id: scenario.id.toString(),
      title: scenario.title,
      description: scenario.description,
      initial_prompt: "",  // Default value since Home doesn't have this
      context: scenario.bulletPoints.join("\n"), // Join bullet points as context
      difficulty_level: scenario.difficulty
    };
    
    console.log("Navigating to practice with formatted scenario:", formattedScenario);
    
    // Try navigation using a simpler path format
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
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/scores');
                }}
                  className={`flex items-center p-2 ${isDarkMode ? 'text-gray-300 hover:bg-[#252525]' : 'text-gray-800 hover:bg-gray-200'} rounded`}
              >
                <BarChart2 className="w-5 h-5 mr-2" /> Scores
              </a>
            </li>
          </ul>
        </nav>

          <div className={`p-4 border-t ${isDarkMode ? 'border-[#333333]' : 'border-gray-200'} flex flex-col space-y-2`}>
          <button
            onClick={toggleTheme}
              className={`px-6 py-2 ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-[#252525]' 
                  : 'text-gray-800 hover:text-gray-900 hover:bg-gray-200'
              } transition-colors border-l border-r ${
                isDarkMode ? 'border-[#333333]' : 'border-gray-200'
              } focus:outline-none focus:ring-0 active:outline-none select-none appearance-none flex items-center justify-center`}
              type="button"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isDarkMode ? <Sun size={20} className="mr-2" /> : <Moon size={20} className="mr-2" />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          <button
            onClick={handleSignOut}
              className={`px-6 py-2 ${
                isDarkMode 
                  ? 'text-red-400 hover:text-red-300 hover:bg-[#252525]' 
                  : 'text-red-600 hover:text-red-700 hover:bg-gray-200'
              } transition-colors border-l border-r ${
                isDarkMode ? 'border-[#333333]' : 'border-gray-200'
              } focus:outline-none focus:ring-0 active:outline-none select-none appearance-none flex items-center justify-center`}
              type="button"
              style={{ WebkitTapHighlightColor: 'transparent' }}
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

            {/* Scenarios Grid */}
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>Practice Scenarios</h1>
                <div className="flex justify-between items-center">
                  <div className="flex">
                    <button 
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-[#252525] px-4 py-0 h-8 text-[#878787] bg-[#F5F5F5] dark:text-[#878787] dark:bg-[#1D1D1D] rounded-l-md rounded-r-none"
                      type="button"
                    >
                      All
                    </button>
                    <button 
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-[#252525] px-4 py-0 h-8 text-[#878787] bg-[#F5F5F5] dark:text-[#878787] dark:bg-[#1D1D1D] rounded-none border-x"
                      type="button"
                    >
                      Popular
                    </button>
                    <button 
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-[#252525] px-4 py-0 h-8 text-[#878787] bg-[#F5F5F5] dark:text-[#878787] dark:bg-[#1D1D1D] rounded-r-md rounded-l-none"
                      type="button"
                    >
                      Official
                    </button>
                  </div>
                  <div className={`${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-gray-100'} rounded-md px-3 w-[30%]`}>
                    <input 
                      className="w-full text-[#585858] text-xs bg-transparent p-2 resize-none focus:outline-none placeholder:text-[#585858]"
                      placeholder="Search Scenarios..."
                      value=""
                      onChange={(e) => {
                        // Add search functionality here
                      }}
                    />
                  </div>
                </div>
              </div>

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
        </main>
    </div>
    </>
  );
};

export default Home; 