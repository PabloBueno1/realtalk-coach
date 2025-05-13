import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseContacts } from '../../lib/supabase';
import HCaptcha from '@hcaptcha/react-hcaptcha';


const Contact: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<{type: 'success' | 'error' | ''; message: string}>({
    type: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const handleVerificationSuccess = (token: string) => {
    setCaptchaToken(token);
    console.log("hCaptcha verified:", token);
  };

  const handleCaptchaError = (err: string) => {
    console.error("hCaptcha error:", err);
    setStatus({ type: 'error', message: 'CAPTCHA verification failed. Please try again.' });
    setCaptchaToken(null);
  };

  const handleCaptchaExpire = () => {
    console.log("hCaptcha expired");
    setStatus({ type: 'error', message: 'CAPTCHA challenge expired. Please try again.' });
    setCaptchaToken(null);
  };

  const validateField = (name: string, value: string): string => {
    const trimmedValue = value.trim();
    switch (name) {
      case 'name':
        if (!trimmedValue) return 'Name is required.';
        if (trimmedValue.length < 2) return 'Name must be at least 2 characters long.';
        if (trimmedValue.length > 100) return 'Name cannot exceed 100 characters.';
        if (!/^[A-Za-z' \\-]+$/.test(trimmedValue)) return "Name can only contain letters, apostrophes, hyphens, and spaces.";
        return '';
      case 'email':
        if (!trimmedValue) return 'Email is required.';
        if (trimmedValue.length > 254) return 'Email cannot exceed 254 characters.';
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedValue)) return 'Invalid email format.';
        return '';
      case 'subject':
        if (!trimmedValue) return 'Subject is required.';
        if (!['general', 'support', 'feedback', 'business', 'other'].includes(trimmedValue)) return 'Please select a valid subject.';
        return '';
      case 'message':
        if (!trimmedValue) return 'Message is required.';
        if (trimmedValue.length < 10) return 'Message must be at least 10 characters long.';
        if (trimmedValue.length > 2000) return 'Message cannot exceed 2000 characters.';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      subject: validateField('subject', formData.subject),
      message: validateField('message', formData.message),
    };
    setErrors(newErrors);
    return Object.values(newErrors).every(error => error === '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate form fields first
    if (!validateForm()) {
      setStatus({ type: 'error', message: 'Please correct the errors in the form.' });
      setIsSubmitting(false); // Keep submitting false if validation fails
      // Reset captcha if validation fails initially
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
      return;
    }

    // 2. Check for CAPTCHA token
    if (!captchaToken) {
      setStatus({ type: 'error', message: 'Please complete the CAPTCHA challenge.' });
      setIsSubmitting(false); // Keep submitting false if CAPTCHA is missing
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    console.log("Form Data:", formData);
    console.log("Captcha Token:", captchaToken); // Log the token

    // TODO: Send captchaToken to your backend for verification
    // Example: const verificationResult = await verifyCaptchaOnBackend(captchaToken);
    // if (!verificationResult.success) { ... handle verification failure ... }

    const { error } = await supabaseContacts
      .from('contact_submissions')
      .insert([{ ...formData }]); // Consider adding captchaToken if your backend/table needs it

    setIsSubmitting(false); // Set submitting to false regardless of outcome

    if (error) {
      setStatus({
        type: 'error',
        message: 'There was an error sending your message. Please try again later.'
      });
      // Reset captcha on error
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } else {
      setStatus({
        type: 'success',
        message: 'Thank you for your message! We will get back to you soon.'
      });
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      // Reset captcha on success
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1d7151]">Contact Us</h1>
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

        <div className="mb-8">
          <p className="text-gray-700">Have questions, feedback, or need assistance with Fidupia? We're here to help. Please fill out the form below and our team will get back to you as soon as possible.</p>
        </div>
        
        {status.type && (
          <div className={`mb-6 p-4 rounded-lg ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 border-b ${errors.name ? 'border-red-500' : 'border-gray-300'} focus:border-[#49ba86] outline-none transition-colors rounded-md`}
              placeholder="Your name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 border-b ${errors.email ? 'border-red-500' : 'border-gray-300'} focus:border-[#49ba86] outline-none transition-colors rounded-md`}
              placeholder="your.email@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 border-b ${errors.subject ? 'border-red-500' : 'border-gray-300'} focus:border-[#49ba86] outline-none transition-colors rounded-md bg-white`}
            >
              <option value="">Select a topic</option>
              <option value="general">General Inquiry</option>
              <option value="support">Technical Support</option>
              <option value="feedback">Feedback</option>
              <option value="business">Business Opportunity</option>
              <option value="other">Other</option>
            </select>
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={5}
              className={`w-full px-3 py-2 border ${errors.message ? 'border-red-500' : 'border-gray-300'} focus:border-[#49ba86] outline-none transition-colors rounded-md resize-none`}
              placeholder="How can we help you?"
              maxLength={2000}
            ></textarea>
            {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
            <p className="text-xs text-gray-500 mt-1 text-right">
              {formData.message.length} / 2000 characters
            </p>
          </div>

          <div className="my-4">
            <HCaptcha
              ref={captchaRef}
              sitekey={process.env.REACT_APP_HCAPTCHA_SITEKEY || ""} // Replace with your site key from environment variables
              onVerify={handleVerificationSuccess}
              onError={handleCaptchaError}
              onExpire={handleCaptchaExpire}
            />
            {/* Optionally add error display specifically for captcha if needed */}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || !captchaToken || (!Object.values(errors).every(e => e === '') && Object.values(formData).some(f => f !== ''))}
              className={`bg-[#49ba86] text-white px-6 py-3 rounded-xl hover:bg-[#3da575] transition-colors ${isSubmitting || !captchaToken || (!Object.values(errors).every(e => e === '') && Object.values(formData).some(f => f !== '')) ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-[#1d7151] mb-2">Email Us</h3>
              <p className="text-gray-700">For support: <a href="mailto:fidupia1@gmail.com" className="text-[#49ba86] hover:underline">fidupia1@gmail.com</a></p>
            </div>
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

export default Contact; 