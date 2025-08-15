import React, { useEffect, useState } from 'react';
import { Globe2, Calendar, Check, ChevronRight, Star, Menu, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import welcomeLogo from '../assets/logo/logo.svg';
import mascotImage from '../assets/images/mascot.png';
import appScreenshot from '../assets/images/appscreenshot.png';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // SEO: Set dynamic page title
  useEffect(() => {
    document.title = 'Fidupia - AI-Powered Interview Practice Simulator | Master Job Interviews with Realistic Simulations';
    
    // Add structured data for better SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Fidupia",
      "description": "AI-powered interview practice simulator for mastering job interviews with realistic simulations, personalized feedback, and comprehensive interview preparation.",
      "url": "https://fidupia.com",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "creator": {
        "@type": "Organization",
        "name": "Fidupia",
        "url": "https://fidupia.com"
      },
      "featureList": [
        "AI-powered interview simulations",
        "Realistic job interview scenarios",
        "Personalized interview feedback",
        "Interview question practice",
        "Real-time performance analysis",
        "Interview confidence building"
      ]
    };

    // Add structured data to head
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup function to remove script when component unmounts
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Check for existing session and redirect if found
  useEffect(() => {
    if (session) {
              // Go directly to home
        navigate('/home');
    }
  }, [session, navigate]);

  const handleScheduleSession = () => {
    navigate('/contact');
  };
  const handleLogin = () => {
    navigate('/login');
  };



  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      {/* Navigation */}
      <nav className="bg-white py-4 shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4">
          <div className="flex items-center">
            <img 
              src={welcomeLogo} 
              alt="Fidupia Logo" 
              className="h-8 md:h-10 w-auto"
            />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/mission" className="text-gray-600 hover:text-gray-900 font-medium">ABOUT</a>
            <a href="/business" className="text-gray-600 hover:text-gray-900 font-medium">FOR BUSINESS</a>
            <a href="/contact" className="text-gray-600 hover:text-gray-900 font-medium">CONTACT US</a>

            <button 
              onClick={handleLogin} 
              className="text-[#49ba86] hover:text-[#3da575] font-medium transition-colors"
            >
              LOGIN
            </button>
            <button 
              onClick={handleScheduleSession} 
              className="bg-[#1d7151] text-white px-6 py-2 rounded-2xl hover:bg-[#166144] transition-colors font-bold shadow-[0_4px_0_0_#134e37]"
            >
              SCHEDULE SESSION
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-4">
              <a href="/mission" className="block text-gray-600 hover:text-gray-900 font-medium py-2">ABOUT</a>
              <a href="/business" className="block text-gray-600 hover:text-gray-900 font-medium py-2">FOR BUSINESS</a>
              <a href="/contact" className="block text-gray-600 hover:text-gray-900 font-medium py-2">CONTACT US</a>

              <button 
                onClick={handleLogin}
                className="w-full text-[#49ba86] hover:text-[#3da575] font-medium py-2 text-left"
              >
                LOGIN
              </button>
              <button 
                onClick={handleScheduleSession}
                className="w-full bg-[#1d7151] text-white px-6 py-3 rounded-2xl hover:bg-[#166144] transition-colors font-bold shadow-[0_4px_0_0_#134e37]"
              >
                SCHEDULE SESSION
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="bg-[#fff] py-8 md:py-16">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2 mb-8 md:mb-0 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-gray-800">
              Your personal AI interview coach!
            </h1>
            <div className="mb-6 md:mb-8 mt-4 md:mt-6">
              <button 
                onClick={handleScheduleSession}
                className="bg-[#1d7151] text-white text-lg px-8 py-4 rounded-2xl hover:bg-[#166144] transition-colors font-bold shadow-[0_4px_0_0_#134e37] flex items-center justify-center w-full md:w-auto"
              >
                Schedule Session
              </button>
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-2 text-gray-600">
              <p>Ready to improve your interview skills?</p>
              <a href="/contact" className="text-[#49ba86] font-bold hover:underline">CONTACT US</a>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex justify-center">
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
              <img 
                src={mascotImage} 
                alt="Fidupia Mascot" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Elevator Pitch Demo Section - moved up, white bg */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4 text-[#1d7151] drop-shadow-sm">Elevator Pitch Demo</h2>
          <p className="text-center text-gray-700 mb-10 max-w-xl text-lg">See how to deliver a concise, impactful elevator pitch in a real practice session. This demo highlights best practices for clarity, confidence, and engagement.</p>
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl p-0 md:p-8 w-full max-w-3xl flex flex-col items-center">
            <div className="w-full aspect-w-16 aspect-h-9 rounded-2xl overflow-hidden">
              <iframe
                src="https://www.youtube.com/embed/FpWBTHXijtE"
                title="Elevator Pitch Demo Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full min-h-[380px] rounded-2xl shadow-lg"
              ></iframe>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section - Moved up */}
      <div className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Why practice interviews with Fidupia?</h2>
            <p className="text-gray-600 text-lg md:text-xl">Our AI-powered interview simulator provides realistic job interview practice with personalized feedback. Master common interview questions, improve your responses, and build confidence through repeated practice sessions.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e6f7f0] rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-[#49ba86]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Realistic Interview Simulations</h3>
              <p className="text-gray-600">Practice with AI-powered interviewers that simulate real job interviews. All you need is a microphone and camera to start mastering your interview skills.</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e8f5ef] rounded-full flex items-center justify-center mb-4">
                <Globe2 className="h-8 w-8 text-[#1d7151]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Industry-Specific Scenarios</h3>
              <p className="text-gray-600">Practice interviews tailored to your industry - from tech and finance to healthcare and marketing. Each scenario includes relevant questions and expectations.</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e6f7f0] rounded-full flex items-center justify-center mb-4">
                <Star className="h-8 w-8 text-[#49ba86]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Detailed Performance Analysis</h3>
              <p className="text-gray-600">Receive comprehensive feedback on your interview performance, including body language, speech clarity, answer quality, and confidence levels.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Learn Anywhere Section */}
      <div className="py-12 md:py-16 bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <div 
            className="w-full h-48 sm:h-64 md:h-80 lg:h-[450px] bg-cover bg-center bg-no-repeat rounded-2xl md:rounded-3xl relative overflow-hidden" 
            style={{ 
              backgroundImage: `url(${appScreenshot})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center'
            }}
        >
          {/* Empty container with just the background image */}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Transform Your Interview Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div>
                <h3 className="text-xl font-bold mb-4 text-[#1d7151]">Interview Skills</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Master common behavioral and technical questions</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Perfect your elevator pitch and self-introduction</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Learn to handle difficult questions with confidence</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Practice salary negotiations and closing questions</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4 text-[#1d7151]">Performance Enhancement</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Build interview confidence through repeated practice</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Improve body language and non-verbal communication</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Reduce interview anxiety and nervousness</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Practice in a safe, judgment-free environment</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Stories Section */}
      <div className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Success Stories</h2>
            <p className="text-center text-gray-600 mb-12 text-lg">See how Fidupia helped job seekers land their dream positions</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-[#49ba86] rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-lg">J</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Jonathan</h4>
                    <p className="text-sm text-gray-600">Big Ideas Educational Services</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"Today is a good day. You accepted your offer! Congratulations, you have successfully signed and accepted your offer from Big Ideas Educational Services."</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-[#1d7151] rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-lg">C</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Carlos</h4>
                    <p className="text-sm text-gray-600">Global Pathology</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"Congratulations on your new role with MARK & KAMBOUR, LLC dba Global Pathology - we are thrilled to welcome you to the team!"</p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <p className="text-gray-600 text-sm">Start your journey to interview success with Fidupia</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">How does the AI interview simulator work?</h3>
                <p className="text-gray-700">Fidupia uses advanced AI to conduct realistic job interviews. The AI asks relevant questions based on your industry and role, analyzes your responses in real-time, and provides detailed feedback on your performance, body language, and communication skills.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">What types of interviews can I practice?</h3>
                <p className="text-gray-700">You can practice various interview types including behavioral interviews, technical interviews, case study interviews, and general job interviews. Each simulation is tailored to specific industries and roles.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">Is Fidupia suitable for entry-level and senior positions?</h3>
                <p className="text-gray-700">Absolutely! Fidupia offers interview simulations for all career levels, from entry-level positions to senior executive roles. The AI adapts questions and expectations based on your experience level and target position.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">Can I practice specific interview questions or scenarios?</h3>
                <p className="text-gray-700">Yes! Fidupia allows you to focus on specific types of questions like "Tell me about yourself," "Why should we hire you," or technical questions. You can also practice handling difficult questions and salary negotiations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#49ba86] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Start mastering interviews today</h2>
          <button 
            onClick={handleScheduleSession}
            className="bg-[#1d7151] text-white text-lg px-8 py-4 rounded-2xl hover:bg-[#166144] transition-colors font-bold shadow-[0_4px_0_0_#134e37]"
          >
            Schedule Your Session
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-center items-start md:space-x-64 space-y-8 md:space-y-0">
            <div>
              <h3 className="font-bold mb-4 text-gray-800 uppercase text-sm">About</h3>
              <ul className="space-y-2">
                <li><a href="/mission" className="text-gray-600 hover:text-gray-900">Mission</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-gray-800 uppercase text-sm">Support</h3>
              <ul className="space-y-2">
                <li><a href="/contact" className="text-gray-600 hover:text-gray-900">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-gray-800 uppercase text-sm">Legal</h3>
              <ul className="space-y-2">
                <li><a href="/terms" className="text-gray-600 hover:text-gray-900">Terms</a></li>
                <li><a href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">© 2025 Fidupia. All rights reserved.</p>
              {/* <div className="flex space-x-4">
                <a href="#" className="text-gray-600 hover:text-gray-900">
                  <span>Twitter</span>
                </a>
                <a href="#" className="text-gray-600 hover:text-gray-900">
                  <span>Instagram</span>
                </a>
                <a href="#" className="text-gray-600 hover:text-gray-900">
                  <span>Facebook</span>
                </a>
              </div> */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 