import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Terms: React.FC = () => {
  const navigate = useNavigate();
  const [terms, setTerms] = useState<string>('');

  useEffect(() => {
    // Load the terms content directly from a string
    setTerms(`Fidupia - Terms of Service (TOS)
Effective Date: 04/28/2025

Welcome to Fidupia! By using our services, you agree to the following Terms of Service ("Terms").
If you do not agree to these Terms, please do not use our services.

1. Use of the Service
You must be at least 13 years old to use Fidupia.

You agree to use Fidupia only for lawful and respectful communication and training purposes.

You may not use Fidupia to harass, abuse, or harm others.

2. Account and Security
You are responsible for maintaining the confidentiality of your account and password.

You agree to notify us immediately if you believe your account has been compromised.

3. User Content
We process user-generated audio, video, and text data temporarily to provide real-time coaching.

We do not store original recordings; only derived data (such as transcripts and coaching metrics) may be retained.

4. Service Availability
We may modify, suspend, or discontinue parts or all of the service at any time without notice.

5. Disclaimers
Fidupia is provided "as is" without warranties of any kind.

We do not guarantee specific results or outcomes from using the platform.

6. Limitation of Liability
We are not liable for indirect, incidental, special, or consequential damages arising from your use of the service.

7. Governing Law
These Terms are governed by the laws of United States of America.

8. Changes to Terms
We may update these Terms periodically. We will notify users of significant changes.`);
  }, []);

  const formattedTerms = terms.split('\n').map((line, index) => {
    if (line.trim() === '') return <br key={index} />;
    if (line.includes('Fidupia - Terms of Service')) 
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
          <h1 className="text-2xl font-bold text-[#1d7151]">Terms of Service</h1>
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
          {formattedTerms}
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

export default Terms; 