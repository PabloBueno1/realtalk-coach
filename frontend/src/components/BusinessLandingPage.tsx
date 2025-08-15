import React, { useEffect, useState } from 'react';
import { Globe2, Calendar, Check, ChevronRight, Star, Menu, X, Users, TrendingUp, Shield, Clock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import welcomeLogo from '../assets/logo/logo.svg';
import mascotImage from '../assets/images/mascot.png';
import appScreenshot from '../assets/images/appscreenshot.png';

const BusinessLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // SEO: Set dynamic page title
  useEffect(() => {
    document.title = 'Fidupia for Business - AI Behavioral Interview Screener | Streamline Your Hiring Process';
    
    // Add structured data for better SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Fidupia for Business",
      "description": "AI-powered behavioral interview screener for businesses. Streamline your hiring process with conversational AI interviews that assess candidates in real-time.",
      "url": "https://fidupia.com/business",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "Contact for pricing",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "creator": {
        "@type": "Organization",
        "name": "Fidupia",
        "url": "https://fidupia.com"
      },
      "featureList": [
        "AI behavioral interview screening",
        "Real-time candidate assessment",
        "Conversational AI interviews",
        "Customizable interview scenarios",
        "Comprehensive candidate reports",
        "Streamlined hiring workflow"
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
            <a href="/" className="text-gray-600 hover:text-gray-900 font-medium">FOR INDIVIDUALS</a>
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
              <a href="/" className="block text-gray-600 hover:text-gray-900 font-medium py-2">FOR INDIVIDUALS</a>
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
              AI behavioral screening that feels human!
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8">
              Transform your hiring process with conversational AI interviews that assess candidates in real-time. No more pre-recorded questions - just natural, engaging conversations that reveal true potential.
            </p>
            <div className="mb-6 md:mb-8 mt-4 md:mt-6">
              <button 
                onClick={handleScheduleSession}
                className="bg-[#1d7151] text-white text-lg px-8 py-4 rounded-2xl hover:bg-[#166144] transition-colors font-bold shadow-[0_4px_0_0_#134e37] flex items-center justify-center w-full md:w-auto"
              >
                Schedule Session
              </button>
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-2 text-gray-600">
              <p>Ready to transform your hiring process?</p>
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

      {/* Features Section */}
      <div className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Why choose Fidupia for your hiring?</h2>
            <p className="text-gray-600 text-lg md:text-xl">Our AI behavioral screener revolutionizes the hiring process with conversational interviews that provide deeper insights than traditional screening methods.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e6f7f0] rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-[#49ba86]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Conversational AI Interviews</h3>
              <p className="text-gray-600">Unlike pre-recorded questions, our AI conducts natural conversations that adapt to candidate responses, providing a more engaging and revealing interview experience.</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e8f5ef] rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-[#1d7151]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Real-time Assessment</h3>
              <p className="text-gray-600">Get instant insights on candidate communication skills, problem-solving abilities, and cultural fit through our advanced behavioral analysis.</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#e6f7f0] rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-[#49ba86]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Conversation Analysis</h3>
              <p className="text-gray-600">Get conversation transcripts and analysis of candidate responses to help you evaluate communication skills and response quality.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Transform Your Hiring Process</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div>
                <h3 className="text-xl font-bold mb-4 text-[#1d7151]">Operational Benefits</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Streamline your screening process</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Scale hiring without increasing HR headcount</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Consistent evaluation across all candidates</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>24/7 candidate screening availability</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4 text-[#1d7151]">Quality Improvements</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Better candidate experience with conversational interviews</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Deeper behavioral insights than traditional screening</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Reduced bias through AI-powered assessment</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-[#49ba86] mr-2 mt-0.5 flex-shrink-0" />
                    <span>Focus on higher quality candidates for final interviews</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Perfect for Every Hiring Need</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="w-12 h-12 bg-[#e6f7f0] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-[#49ba86]" />
                </div>
                <h3 className="font-bold mb-2">High-Volume Hiring</h3>
                <p className="text-gray-600 text-sm">Screen hundreds of candidates efficiently for seasonal or growth hiring</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="w-12 h-12 bg-[#e8f5ef] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-[#1d7151]" />
                </div>
                <h3 className="font-bold mb-2">Executive Search</h3>
                <p className="text-gray-600 text-sm">Assess leadership qualities and strategic thinking for senior roles</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="w-12 h-12 bg-[#e6f7f0] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe2 className="h-6 w-6 text-[#49ba86]" />
                </div>
                <h3 className="font-bold mb-2">Remote Hiring</h3>
                <p className="text-gray-600 text-sm">Evaluate candidates globally with consistent, location-agnostic screening</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="w-12 h-12 bg-[#e8f5ef] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-[#1d7151]" />
                </div>
                <h3 className="font-bold mb-2">Urgent Hiring</h3>
                <p className="text-gray-600 text-sm">Accelerate time-to-hire for critical positions with immediate screening</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">How does AI behavioral screening work?</h3>
                <p className="text-gray-700">Our AI conducts natural, conversational interviews that adapt to candidate responses. It analyzes communication patterns, problem-solving approaches, and behavioral indicators to provide comprehensive candidate insights.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">Can we customize the interview questions?</h3>
                <p className="text-gray-700">Absolutely! You can create custom interview scenarios tailored to specific roles, company culture, and assessment criteria. Our platform adapts to your unique hiring needs.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">What types of insights do we receive?</h3>
                <p className="text-gray-700">You'll receive conversation transcripts and basic analysis of candidate responses. The AI provides insights on communication patterns and response quality to help inform your hiring decisions.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-3 text-[#1d7151]">What kind of support do you provide?</h3>
                <p className="text-gray-700">We provide comprehensive support to help you get the most out of our platform, including setup assistance, training, and ongoing customer service to ensure your success.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#49ba86] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to revolutionize your hiring?</h2>
          <p className="text-xl mb-8 opacity-90">Discover how AI can transform your candidate screening process</p>
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BusinessLandingPage; 