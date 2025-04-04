import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, User, Settings, BookOpen, Sun, Moon } from 'lucide-react'; // Added Sun/Moon icons

const Home: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or default to light mode
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });

  // Apply theme class to <html> element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
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

  // Updated learning path with conversation types
  const learningPath = [
    { id: 1, title: 'Formal' },
    { id: 2, title: 'Informal' },
    { id: 3, title: 'Presentations' },
    { id: 4, title: 'Networking' },
    // Add more modules as needed
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 p-4 shadow-md flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-primary-600 dark:text-primary-400">RealTalk Coach</h2>
        <nav className="flex-grow">
          <ul>
            <li className="mb-4">
              <a href="#" className="flex items-center p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                <BookOpen className="mr-3" size={20} /> Learn
              </a>
            </li>
            <li className="mb-4">
              <a href="#" className="flex items-center p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                <User className="mr-3" size={20} /> Profile
              </a>
            </li>
            {/* Settings Link - Can be used later for a dedicated settings page */}
            {/* <li className="mb-4">
              <a href="#" className="flex items-center p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                <Settings className="mr-3" size={20} /> Settings
              </a>
            </li> */}
          </ul>
        </nav>

        {/* Dark Mode Toggle Button in Sidebar */}
        <button
          onClick={toggleTheme}
          className="mb-4 w-full flex items-center justify-center p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {isDarkMode ? (
            <><Sun className="mr-2" size={20} /> Light Mode</>
          ) : (
            <><Moon className="mr-2" size={20} /> Dark Mode</>
          )}
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
          <LogOut className="mr-2" size={20} />
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto bg-gray-100 dark:bg-gray-900">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-200">Conversation Dashboard</h1>

        {message && (
          <div className={`message ${isSuccess ? 'success' : 'error'} mb-6`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {learningPath.map(module => (
            <div
              key={module.id}
              className={`p-6 rounded-lg shadow-md flex flex-col items-center justify-center text-center transition-all duration-200 bg-green-200 dark:bg-green-700 hover:bg-green-300 dark:hover:bg-green-600
              }`}>
              <div className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center bg-green-500 dark:bg-green-600`}>
                 <span className="text-white dark:text-gray-100 text-2xl">{module.id}</span>
              </div>
              <h3 className={`font-semibold text-lg mb-2 text-green-800 dark:text-green-100`}>{module.title}</h3>
              <button
                onClick={() => navigate(`/practice/${module.id}`)}
                className={`mt-2 px-4 py-1 rounded text-sm font-medium bg-green-600 dark:bg-green-500 text-white dark:text-gray-100 hover:bg-green-700 dark:hover:bg-green-400
                }`}>
                Start
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Home; 