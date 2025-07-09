import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Mission: React.FC = () => {
  const navigate = useNavigate();
  const [mission, setMission] = useState<string>('');

  // SEO: Set dynamic page title
  useEffect(() => {
    document.title = 'Our Mission - Fidupia | AI Communication Coaching Platform';
  }, []);

  useEffect(() => {
    // Load the mission content directly from a string
    setMission(`Mission Statement for Fidupia
Fidupia provides targeted guidance to enhance your communication skills through structured practice and feedback. We designed our app to identify specific areas for improvement and help you refine your conversational abilities in a private, low-pressure environment.

We recognize that effective communication develops through deliberate practice and personalized insights. Our tool delivers practical feedback that helps you make meaningful adjustments to how you express yourself and connect with others.

Whether you're preparing for professional interactions, working on personal relationships, or simply wanting to communicate with more clarity and confidence, Fidupia offers the focused practice you need. We provide a reliable resource for communication development that fits into your life and grows with you.

Our commitment is to deliver useful, actionable coaching that leads to noticeable improvements in your real-world conversations. With Fidupia, meaningful progress is achievable through consistent practice and thoughtful feedback.`);
  }, []);

  const formattedMission = mission.split('\n').map((line, index) => {
    if (line.trim() === '') return <br key={index} />;
    if (line.includes('Mission Statement')) 
      return <h1 className="text-2xl font-bold text-[#1d7151] mb-2" key={index}>{line}</h1>;
    return <p className="my-2 text-gray-700" key={index}>{line}</p>;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1d7151]">Our Mission</h1>
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
        
        <div className="prose max-w-none">
          {formattedMission}
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

export default Mission; 