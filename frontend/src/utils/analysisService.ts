import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Replace the hardcoded API_BASE_URL with the environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL;

// Helper function to get auth token
const getAuthToken = (token?: string) => {
  return token || localStorage.getItem('access_token');
};

// Helper function to handle 401 errors
const handle401Error = (error: any) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Clear local storage
    localStorage.removeItem('access_token');
    // Redirect to login page
    window.location.href = '/login';
  }
  throw error;
};

/**
 * Analyze speech from a video file
 * @param videoBlob The video file to analyze
 * @param scenarioId Optional scenario ID to associate with the analysis
 * @param token Optional auth token
 * @returns The speech session response
 */
export const analyzeSpeech = async (videoBlob: Blob, scenarioId?: string, token?: string): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', videoBlob);
    if (scenarioId) {
      formData.append('scenario_id', scenarioId);
    }

    const response = await axios.post(
      `${API_BASE_URL}/speech/analyze`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
          'Content-Type': 'multipart/form-data',
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
 * Analyze visual elements from a video file
 * @param videoBlob The video file to analyze
 * @param speechSessionId The ID of the corresponding speech session
 * @param token Optional auth token
 * @returns The visual session response
 */
export const analyzeVisual = async (videoBlob: Blob, speechSessionId: string, token?: string): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', videoBlob);
    formData.append('speech_session_id', speechSessionId);

    const response = await axios.post(
      `${API_BASE_URL}/visual/analyze`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken(token)}`,
          'Content-Type': 'multipart/form-data',
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