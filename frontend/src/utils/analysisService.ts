import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Helper function to get auth token
const getAuthToken = (token?: string) => {
  if (token) return token;
  
  // Try to get from localStorage or other sources
  const session = localStorage.getItem('session');
  if (session) {
    const sessionData = JSON.parse(session);
    return sessionData.access_token;
  }
  
  return null;
};

// Helper function to handle 401 errors
const handle401Error = (error: any) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Redirect to login or refresh token
    window.location.href = '/login';
  }
};

/**
 * Upload video to Supabase storage and get signed URL
 * @param videoBlob The video file to upload
 * @param token Optional auth token
 * @returns Object containing signed URL and file name
 */
export const uploadVideoAndGetSignedUrl = async (videoBlob: Blob, token?: string): Promise<{ signedUrl: string; fileName: string }> => {
  try {
    const authToken = getAuthToken(token);
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `conversation_${timestamp}.webm`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBlob, {
        contentType: 'video/webm',
        cacheControl: '3600'
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    // Get signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('videos')
      .createSignedUrl(fileName, 3600); // 1 hour

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error('Failed to generate signed URL');
    }

    return {
      signedUrl: signedUrlData.signedUrl,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error uploading video:', error);
    throw new Error('Failed to upload video to storage');
  }
};

/**
 * Analyze speech from a video URL
 * @param videoUrl The signed URL of the video file
 * @param fileName The name of the uploaded file
 * @param scenarioId Optional scenario ID to associate with the analysis
 * @param token Optional auth token
 * @returns The speech session response
 */
export const analyzeSpeechFromUrl = async (videoUrl: string, fileName: string, scenarioId?: string, token?: string): Promise<any> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/speech/analyze-url`,
      {
        url: videoUrl,
        fileName: fileName,
        scenario_id: scenarioId
      },
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
          'Content-Type': 'application/json',
        },
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error analyzing speech:', error);
    handle401Error(error);
    throw new Error('Failed to analyze speech');
  }
};

/**
 * Analyze visual elements from a video URL
 * @param videoUrl The signed URL of the video file
 * @param fileName The name of the uploaded file
 * @param speechSessionId The ID of the corresponding speech session
 * @param token Optional auth token
 * @returns The visual session response
 */
export const analyzeVisualFromUrl = async (videoUrl: string, fileName: string, speechSessionId: string, token?: string): Promise<any> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/visual/analyze-url`,
      {
        url: videoUrl,
        fileName: fileName,
        speech_session_id: speechSessionId
      },
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
          'Content-Type': 'application/json',
        },
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error analyzing visual elements:', error);
    handle401Error(error);
    throw new Error('Failed to analyze visual elements');
  }
};

/**
 * Generate feedback for a speech session
 * @param sessionId The speech session ID
 * @param token Optional auth token
 * @returns The speech feedback response
 */
export const generateSpeechFeedback = async (sessionId: string, token?: string): Promise<any> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/speech/feedback/${sessionId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
        },
        timeout: 300000, // 5 minutes
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error generating speech feedback:', error);
    handle401Error(error);
    throw new Error('Failed to generate speech feedback');
  }
};

/**
 * Generate feedback for a visual session
 * @param sessionId The visual session ID
 * @param token Optional auth token
 * @returns The visual feedback response
 */
export const generateVisualFeedback = async (sessionId: string, token?: string): Promise<any> => {
  try {
    // Add longer delay to ensure analysis is complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const response = await axios.post(
      `${API_BASE_URL}/visual/feedback/${sessionId}`,
      null,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
          'Content-Type': 'application/json',
        },
        timeout: 300000, // 5 minutes
        withCredentials: false
      }
    );
    
    if (!response.data) {
      throw new Error('No data received from visual feedback endpoint');
    }
    return response.data;
  } catch (error) {
    console.error('Error generating visual feedback:', error);
    handle401Error(error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Request config:', error.config);
      throw new Error(`Failed to generate visual feedback: ${error.response?.data?.detail || error.message}`);
    }
    throw new Error('Failed to generate visual feedback: Unknown error');
  }
};

/**
 * Get feedback for a speech session
 * @param sessionId The speech session ID
 * @param token Optional auth token
 * @returns The speech feedback response
 */
export const getSpeechFeedback = async (sessionId: string, token?: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/speech/sessions/${sessionId}/feedback`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
        },
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting speech feedback:', error);
    handle401Error(error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw new Error(`Failed to get speech feedback: ${error.response?.data?.detail || error.message}`);
    }
    throw new Error('Failed to get speech feedback: Unknown error');
  }
};

/**
 * Get feedback for a visual session
 * @param sessionId The visual session ID
 * @param token Optional auth token
 * @returns The visual feedback response
 */
export const getVisualFeedback = async (sessionId: string, token?: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/visual/sessions/${sessionId}/feedback`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
        },
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting visual feedback:', error);
    handle401Error(error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw new Error(`Failed to get visual feedback: ${error.response?.data?.detail || error.message}`);
    }
    throw new Error('Failed to get visual feedback: Unknown error');
  }
};

export const getSpeechSession = async (sessionId: string, token?: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/speech/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
        },
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting speech session:', error);
    handle401Error(error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw new Error(`Failed to get speech session: ${error.response?.data?.detail || error.message}`);
    }
    throw new Error('Failed to get speech session: Unknown error');
  }
};

export const getVisualSession = async (sessionId: string, token?: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/visual/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
        },
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting visual session:', error);
    handle401Error(error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw new Error(`Failed to get visual session: ${error.response?.data?.detail || error.message}`);
    }
    throw new Error('Failed to get visual session: Unknown error');
  }
};

/**
 * Get combined speech session and feedback data
 * @param sessionId The speech session ID
 * @param token Optional auth token
 * @returns The combined speech session and feedback response
 */
export const getCombinedSpeechAnalysis = async (sessionId: string, token?: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/speech/sessions/${sessionId}/combined`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
        },
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting combined speech analysis:', error);
    handle401Error(error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw new Error(`Failed to get combined speech analysis: ${error.response?.data?.detail || error.message}`);
    }
    throw new Error('Failed to get combined speech analysis: Unknown error');
  }
};

/**
 * Get combined visual session and feedback data
 * @param sessionId The visual session ID
 * @param token Optional auth token
 * @returns The combined visual session and feedback response
 */
export const getCombinedVisualAnalysis = async (sessionId: string, token?: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/visual/sessions/${sessionId}/combined`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
        },
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting combined visual analysis:', error);
    handle401Error(error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw new Error(`Failed to get combined visual analysis: ${error.response?.data?.detail || error.message}`);
    }
    throw new Error('Failed to get combined visual analysis: Unknown error');
  }
}; 