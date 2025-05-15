import React from 'react';
import { useNavigate } from 'react-router-dom';

const ComingSoon: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1d7151]">Demo</h1>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center px-4 py-2 text-sm bg-[#e6f7f0] hover:bg-[#e8f5ef] text-[#1d7151] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
        

        <div className="text-center py-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Coming Soon</h2>
          <p className="text-xl text-gray-600 mb-8">
            We're working hard to bring you something amazing. Stay tuned!
          </p>
          <div className="animate-pulse">
            <div className="h-2 w-20 bg-gray-300 rounded mx-auto"></div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">© 2025 Fidupia. All rights reserved.</p>
            <button 
              onClick={() => navigate(-1)}
              className="bg-[#49ba86] text-white px-4 py-2 rounded-xl hover:bg-[#3da575] transition-colors"
            >
              Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon; 