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
    document.title = 'Fidupia - AI-Powered Conversation Coach | Practice Job Interviews, Networking & Presentations';
    
    // Add structured data for better SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Fidupia",
      "description": "AI-powered conversation coach for practicing job interviews, networking, presentations, and friendly conversations with personalized feedback.",
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
        "AI-powered conversation practice",
        "Job interview preparation",
        "Presentation skills training",
        "Networking conversation practice",
        "Real-time feedback and analysis",
        "Personalized coaching recommendations"
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
      // Check if user has completed profile setup
      const checkProfileSetup = async () => {
        try {
          const { data: profilePreferences } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', session.user.id)
            .single();

          if (!profilePreferences?.preferences || Object.keys(profilePreferences.preferences).length === 0) {
            navigate('/profile-setup');
          } else {
            navigate('/home');
          }
        } catch (error) {
          console.error('Error checking profile setup:', error);
          navigate('/home');
        }
      };

      checkProfileSetup();
    }
  }, [session, navigate]);

  const handleGetLogin = () => {
    navigate('/login');
  }
  const handleGetStarted = () => {
    navigate('/signup');
  };

  const handleDonate = () => {
    window.open('https://buy.stripe.com/3cI5kvahNbr76dg0USg7e00', '_blank');
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
            <a href="/contact" className="text-gray-600 hover:text-gray-900 font-medium">CONTACT US</a>
            <button 
              onClick={handleDonate}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              SUPPORT
            </button>
            <button 
              onClick={handleGetLogin} 
              className="bg-[#49ba86] text-white px-6 py-2 rounded-2xl hover:bg-[#3da575] transition-colors font-bold shadow-[0_4px_0_0_#33825e]"
            >
              LOGIN
            </button>
            <button 
              onClick={handleGetStarted}
              className="bg-[#1d7151] text-white px-6 py-2 rounded-2xl hover:bg-[#166144] transition-colors font-bold shadow-[0_4px_0_0_#134e37]"
            >
              GET STARTED
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
              <a href="/contact" className="block text-gray-600 hover:text-gray-900 font-medium py-2">CONTACT US</a>
              <button 
                onClick={handleDonate}
                className="w-full text-left text-gray-600 hover:text-gray-900 font-medium py-2"
              >
                SUPPORT
              </button>
              <button 
                onClick={handleGetLogin} 
                className="w-full bg-[#49ba86] text-white px-6 py-3 rounded-2xl hover:bg-[#3da575] transition-colors font-bold shadow-[0_4px_0_0_#33825e]"
              >
                LOGIN
              </button>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-[#1d7151] text-white px-6 py-3 rounded-2xl hover:bg-[#166144] transition-colors font-bold shadow-[0_4px_0_0_#134e37]"
              >
                GET STARTED
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
              Your personal conversation coach!
            </h1>
            <div className="mb-6 md:mb-8 mt-4 md:mt-6">
              <button 
                onClick={handleGetStarted}
                className="bg-[#1d7151] text-white text-lg px-8 py-4 rounded-2xl hover:bg-[#166144] transition-colors font-bold shadow-[0_4px_0_0_#134e37] flex items-center justify-center w-full md:w-auto"
              >
                Get Started
              </button>
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-2 text-gray-600">
              <p>I already have an account.</p>
              <a href="/login" className="text-[#49ba86] font-bold hover:underline">LOGIN</a>
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

      {/* Features Section - Moved up */}
      <div className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Why practice with Fidupia?</h2>
            <p className="text-gray-600 text-lg md:text-xl">Our AI-powered conversation practice tool helps users improve their communication skills through personalized feedback and real-world conversation scenarios. Master job interviews, networking events, presentations, and everyday conversations with confidence.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e6f7f0] rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-[#49ba86]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Daily Practice Sessions</h3>
              <p className="text-gray-600">Build confidence through consistent practice. All you need is a microphone and camera to begin transforming your communication abilities with our AI conversation coach.</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e8f5ef] rounded-full flex items-center justify-center mb-4">
                <Globe2 className="h-8 w-8 text-[#1d7151]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Realistic Conversation Scenarios</h3>
              <p className="text-gray-600">Practice with real-world situations you'll actually encounter - from job interviews and networking events to presentations and casual conversations.</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e6f7f0] rounded-full flex items-center justify-center mb-4">
                <Star className="h-8 w-8 text-[#49ba86]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Personalized Feedback & Progress</h3>
              <p className="text-gray-600">Receive detailed AI-powered feedback on your communication style, speech patterns, and conversation flow. Track your improvement over time with detailed analytics.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Language Selection Section - Moved down */}
      <div className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-4">Choose Your Communication Training Focus</h2>
          <p className="text-center text-gray-600 mb-8 md:mb-12 max-w-2xl mx-auto">Select from our comprehensive range of conversation practice scenarios designed to improve your professional and personal communication skills.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { name: 'Job Interview Practice', icon: '👔', description: 'Master interview techniques and common questions' },
              { name: 'Networking & Small Talk', icon: '👋', description: 'Build connections with confident conversation' },
              { name: 'Presentation Skills', icon: '🎤', description: 'Develop compelling public speaking abilities' },
              { name: 'Professional Networking', icon: '🤝', description: 'Excel at business networking events' },
            ].map((scenario) => (
              <div key={scenario.name} className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 hover:shadow-lg transition-shadow cursor-pointer hover:border-[#49ba86]">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 md:mb-4 text-3xl md:text-4xl">
                    {scenario.icon}
                  </div>
                  <h3 className="font-bold text-lg md:text-xl mb-2">{scenario.name}</h3>
                  <p className="text-sm text-gray-600">{scenario.description}</p>
                </div>
              </div>
            ))}
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

      {/* //Testimonials Section
      <div className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Reviews</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-[#e6f7f0] rounded-full flex items-center justify-center mr-3">
                  <span className="font-bold text-[#49ba86]">S</span>
                </div>
                <div>
                  <p className="font-bold">Sarah K.</p>
                  <p className="text-gray-500 text-sm">New York, NY</p>
                </div>
              </div>
              <p className="text-gray-700">"Fidupia helped me prepare for my job interviews. The AI feedback was incredibly useful and helped me sound more confident."</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-[#e8f5ef] rounded-full flex items-center justify-center mr-3">
                  <span className="font-bold text-[#1d7151]">M</span>
                </div>
                <div>
                  <p className="font-bold">Michael T.</p>
                  <p className="text-gray-500 text-sm">London, UK</p>
                </div>
              </div>
              <p className="text-gray-700">"The scenarios are so realistic! I practice every day and have seen a huge improvement in my networking skills."</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-[#e6f7f0] rounded-full flex items-center justify-center mr-3">
                  <span className="font-bold text-[#49ba86]">J</span>
                </div>
                <div>
                  <p className="font-bold">Carlos R.</p>
                  <p className="text-gray-500 text-sm">Tokyo, Japan</p>
                </div>
              </div>
              <p className="text-gray-700">"As a non-native English speaker, this app has been a game-changer for my professional communication. The formal conversation practice is excellent!"</p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Benefits Section */}
      <div className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Transform Your Communication Skills</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div>
                <h3 className="text-xl font-bold mb-4 text-[#1d7151]">Professional Benefits</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Ace job interviews with confidence and preparation</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Excel at networking events and professional gatherings</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Deliver compelling presentations and public speeches</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Improve workplace communication and collaboration</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4 text-[#1d7151]">Personal Development</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Build lasting confidence in social situations</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Develop active listening and empathy skills</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Overcome social anxiety and communication barriers</span>
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

      {/* FAQ Section */}
      <div className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">How does AI conversation coaching work?</h3>
                <p className="text-gray-700">Fidupia uses advanced AI to analyze your speech patterns, conversation flow, and communication style. You practice real conversations with our AI, and receive detailed feedback on areas like clarity, confidence, engagement, and professional presence.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">What equipment do I need to get started?</h3>
                <p className="text-gray-700">All you need is a computer or mobile device with a microphone and camera. Our platform works in any modern web browser - no downloads or installations required.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">Is Fidupia suitable for non-native English speakers?</h3>
                <p className="text-gray-700">Absolutely! Fidupia is designed to help anyone improve their English conversation skills, regardless of their native language. Our AI provides patient, personalized feedback to help you develop natural conversation abilities.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">Can I practice specific scenarios like job interviews?</h3>
                <p className="text-gray-700">Yes! Fidupia offers targeted practice scenarios including job interviews, networking events, presentations, and casual conversations. Each scenario is designed to simulate real-world situations you'll encounter.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#49ba86] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Start learning conversations today</h2>
          <button 
            onClick={handleGetStarted}
            className="bg-[#1d7151] text-white text-lg px-8 py-4 rounded-2xl hover:bg-[#166144] transition-colors font-bold shadow-[0_4px_0_0_#134e37]"
          >
            Get Started - It's Free
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4 text-gray-800 uppercase text-sm">About</h3>
              <ul className="space-y-2">
                <li><a href="/mission" className="text-gray-600 hover:text-gray-900">Mission</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-gray-800 uppercase text-sm">Product</h3>
              <ul className="space-y-2">
                <li><Link to="/coming-soon" className="text-gray-600 hover:text-gray-900">Demo</Link></li>
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