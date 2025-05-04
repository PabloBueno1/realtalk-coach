import React, { useState, useEffect } from 'react';
import { logRequestStats, resetDebugStats, startRequestMonitoring } from '../utils/debugTools';

interface DevToolsProps {
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  monitoringInterval?: number;
}

const DevTools: React.FC<DevToolsProps> = ({ 
  position = 'bottom-right',
  monitoringInterval = 10000
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stopMonitoring, setStopMonitoring] = useState<(() => void) | null>(null);
  
  // Position styles
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-left': 'top-4 left-4'
  };
  
  // Start/stop monitoring when the component mounts/unmounts
  useEffect(() => {
    // Cleanup function to stop monitoring on unmount
    return () => {
      if (stopMonitoring) {
        stopMonitoring();
      }
    };
  }, [stopMonitoring]);
  
  const handleToggleMonitoring = () => {
    if (isMonitoring && stopMonitoring) {
      stopMonitoring();
      setStopMonitoring(null);
      setIsMonitoring(false);
    } else {
      const stopFn = startRequestMonitoring(monitoringInterval);
      setStopMonitoring(() => stopFn);
      setIsMonitoring(true);
    }
  };
  
  const handleShowStats = () => {
    logRequestStats();
  };
  
  const handleReset = () => {
    resetDebugStats();
  };
  
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return (
    <div className={`fixed ${positionStyles[position]} z-50`}>
      {/* Collapsed view - only show when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-800 text-white px-3 py-2 rounded-full hover:bg-gray-700 shadow-lg"
          aria-label="Open DevTools"
        >
          🛠️
        </button>
      )}
      
      {/* Expanded view */}
      {isOpen && (
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-xl w-64">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">DevTools</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
              aria-label="Close DevTools"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <button 
              onClick={handleToggleMonitoring}
              className={`block w-full text-left px-3 py-2 rounded ${
                isMonitoring ? 'bg-red-700 hover:bg-red-800' : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {isMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
            </button>
            
            <button 
              onClick={handleShowStats}
              className="block w-full text-left px-3 py-2 rounded bg-gray-700 hover:bg-gray-600"
            >
              📊 Show API Stats
            </button>
            
            <button 
              onClick={handleReset}
              className="block w-full text-left px-3 py-2 rounded bg-gray-700 hover:bg-gray-600"
            >
              🗑️ Reset Stats
            </button>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
            <p>API monitoring tools for development only.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevTools; 