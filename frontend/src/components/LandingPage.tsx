import React from 'react';
import { Globe2, Calendar, Check, ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import welcomeLogo from '../assets/logo/logo.svg';
import mascotImage from '../assets/images/mascot.png';
import appScreenshot from '../assets/images/appscreenshot.png';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGetLogin = () => {
    navigate('/login');
  }
  const handleGetStarted = () => {
    navigate('/signup');
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
              className="h-10 w-auto"
            />
          </div>
          <div className="hidden md:flex items-center space-x-8">

            <a href="/mission" className="text-gray-600 hover:text-gray-900 font-medium">ABOUT</a>
            <a href="/contact" className="text-gray-600 hover:text-gray-900 font-medium">SUPPORT</a>
            <button 
              onClick={handleGetLogin} 
              className="bg-[#49ba86] text-white px-6 py-2 rounded-2xl hover:bg-[#3da575] transition-colors font-bold"
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
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-[#fff] py-16">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">
              Your personal conversation coach!
            </h1>
            <div className="mb-8 mt-6">
              <button 
                onClick={handleGetStarted}
                className="bg-[#1d7151] text-white text-lg px-8 py-4 rounded-2xl hover:bg-[#166144] transition-colors font-bold shadow-[0_4px_0_0_#134e37] flex items-center justify-center w-full md:w-auto"
              >
                Get Started
              </button>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <p>I already have an account.</p>
              <a href="/login" className="text-[#49ba86] font-bold hover:underline">LOGIN</a>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-72 h-72 md:w-96 md:h-96">
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
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-6">Why practice with Fidupia?</h2>
            <p className="text-gray-600 text-xl">Our conversation practice tool helps users improve their communications skills through AI-powered feedback and real-world conversation practice.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e6f7f0] rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-[#49ba86]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Practice Daily</h3>
              <p className="text-gray-600">All you need is a microphone and camera to begin transforming your abilities.</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e8f5ef] rounded-full flex items-center justify-center mb-4">
                <Globe2 className="h-8 w-8 text-[#1d7151]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Realistic scenarios</h3>
              <p className="text-gray-600">Practice with real-world situations you'll actually encounter in your daily life.</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e6f7f0] rounded-full flex items-center justify-center mb-4">
                <Star className="h-8 w-8 text-[#49ba86]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Stay motivated</h3>
              <p className="text-gray-600">Our approach keeps you engaged with fun challenges and rewards.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Language Selection Section - Moved down */}
      <div className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">Choose what you want to practice</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Job Interviews', icon: '👔' },
              { name: 'Friendly Chats', icon: '👋' },
              { name: 'Presentations', icon: '🎤' },
              { name: 'Networking', icon: '🤝' },
            ].map((scenario) => (
              <div key={scenario.name} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer hover:border-[#49ba86]">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 text-4xl">
                    {scenario.icon}
                  </div>
                  <span className="font-bold text-xl">{scenario.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Learn Anywhere Section */}
      <div className="py-16 bg-white">
        <div 
          className="container max-w-6xl mx-auto h-[450px] bg-cover bg-center bg-no-repeat rounded-3xl" 
          style={{ backgroundImage: `url(${appScreenshot})` }}
        >
          {/* Empty container with just the background image */}
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
                <li><a href="/demo" className="text-gray-600 hover:text-gray-900">Demo</a></li>
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