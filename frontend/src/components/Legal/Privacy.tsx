import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Privacy: React.FC = () => {
  const navigate = useNavigate();
  const [privacy, setPrivacy] = useState<string>('');

  useEffect(() => {
    // Load the privacy content directly from a string
    setPrivacy(`Fidupia - Privacy Policy
Effective Date: 04/28/2025

At Fidupia, we respect your privacy. This Privacy Policy explains how we collect, use, and protect your information.

1. Information We Collect
Audio and Video Data: Processed in real-time for coaching purposes, not stored permanently.

Derived Data: We may retain transcripts, conversation metrics, and feedback reports.

Account Information: Email address, username, and other profile data you provide.

2. How We Use Your Information
To provide real-time conversation coaching and feedback.

To improve our services based on anonymized usage metrics.

To communicate important service updates.

3. Data Security
All data transmission is encrypted via SSL/TLS.

Data storage (e.g., transcripts) is secured through trusted third-party providers like Supabase.

4. Your Rights
You may request access to or deletion of your derived data at any time by contacting pablojbueno@gmail.com.

5. Third-Party Services
We use trusted providers for infrastructure (e.g., RunPod, Supabase).

We do not sell, rent, or share your personal information for marketing purposes.

6. Children's Privacy
Fidupia is not intended for children under 13 years of age.

7. Changes to This Privacy Policy
We may update this Privacy Policy and will notify users of material changes.`);
  }, []);

  const formattedPrivacy = privacy.split('\n').map((line, index) => {
    if (line.trim() === '') return <br key={index} />;
    if (line.includes('Fidupia - Privacy Policy')) 
      return <h1 className="text-2xl font-bold text-[#1d7151] mb-2" key={index}>{line}</h1>;
    if (line.endsWith(':')) 
      return <h2 className="text-xl font-bold mt-6 mb-2 text-[#49ba86]" key={index}>{line}</h2>;
    if (line.match(/^\d+\./)) 
      return <h3 className="text-lg font-semibold mt-4 mb-2 text-[#1d7151]" key={index}>{line}</h3>;
    return <p className="my-2 text-gray-700" key={index}>{line}</p>;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1d7151]">Privacy Policy</h1>
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
          {formattedPrivacy}
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

export default Privacy; 