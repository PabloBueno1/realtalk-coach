import React, { useState, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';

// Use lazy loading to avoid initializing components until they're needed
const DevAuthPanel = lazy(() => import('./DevAuthPanel'));
const UserSwitcher = lazy(() => import('./UserSwitcher'));

const AdminPage: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  // State to control which panel is active to avoid having both fetching users simultaneously
  const [activePanel, setActivePanel] = useState<'dev-panel' | 'user-info'>('dev-panel');
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  
  // Check if user is authenticated and has admin role
  const isAdmin = isAuthenticated() && currentUser?.role === 'admin';
  
  if (!isAuthenticated()) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You need to be logged in to access this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                You need admin privileges to access this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Toggle user switcher visibility when switching between panels
  const handlePanelChange = (panel: 'dev-panel' | 'user-info') => {
    if (panel === 'user-info' && !showUserSwitcher) {
      // First hide the dev panel to avoid parallel fetching
      setActivePanel(panel);
      // Then show UserSwitcher after a small delay
      setTimeout(() => setShowUserSwitcher(true), 100);
    } else {
      setShowUserSwitcher(false);
      setActivePanel(panel);
    }
  };
  
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        {/* Only render UserSwitcher if needed */}
        {activePanel === 'user-info' && showUserSwitcher && (
          <Suspense fallback={<div>Loading...</div>}>
            <UserSwitcher />
          </Suspense>
        )}
      </header>
      
      <div className="mb-8">
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activePanel === 'dev-panel' 
                ? 'text-indigo-600 border-b-2 border-indigo-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handlePanelChange('dev-panel')}
          >
            User Authentication Panel
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activePanel === 'user-info' 
                ? 'text-indigo-600 border-b-2 border-indigo-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handlePanelChange('user-info')}
          >
            User Information
          </button>
        </div>
        
        {activePanel === 'dev-panel' ? (
          <Suspense fallback={<div>Loading panel...</div>}>
            <DevAuthPanel />
          </Suspense>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Environment:</span>
                  <span className="font-medium text-green-600">Development</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Auth Mode:</span>
                  <span className="font-medium text-blue-600">JWT with User Switching</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Database:</span>
                  <span className="font-medium text-green-600">Connected</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Current User Info</h2>
              {currentUser && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{currentUser.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{currentUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium text-gray-500">{currentUser.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium text-purple-600">{currentUser.role || 'user'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Production Mode Instructions</h2>
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700">
            This user switching system is designed for <strong>local development only</strong>. For production:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>Replace localStorage with HttpOnly cookies</li>
            <li>Implement proper authentication flow with login/logout</li>
            <li>Add token refresh mechanisms</li>
            <li>Enable CSRF protection</li>
            <li>Remove the development-only endpoints</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminPage; 