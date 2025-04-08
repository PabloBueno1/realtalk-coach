import axios from 'axios';

// Create a single axios instance with default config
const API_BASE_URL = 'http://localhost:8000';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

// Create axios instance with default config
const createAxiosInstance = () => {
  const token = getAuthToken();
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    // Disable automatic CORS preflight requests
    withCredentials: false
  });
};

/**
 * Analyze speech from a video file
 * @param videoBlob The video file to analyze
 * @returns The speech session response
 */
export const analyzeSpeech = async (videoBlob: Blob): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', videoBlob);

    const response = await axios.post(
      `${API_BASE_URL}/speech/analyze`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error analyzing speech:', error);
    throw new Error('Failed to analyze speech');
  }
};

/**
 * Analyze visual elements from a video file
 * @param videoBlob The video file to analyze
 * @param speechSessionId The ID of the corresponding speech session
 * @returns The visual session response
 */
export const analyzeVisual = async (videoBlob: Blob, speechSessionId: string): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', videoBlob);
    formData.append('speech_session_id', speechSessionId);

    const response = await axios.post(
      `${API_BASE_URL}/visual/analyze`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error analyzing visual elements:', error);
    throw new Error('Failed to analyze visual elements');
  }
};

/**
 * Generate feedback for a speech session
 * @param sessionId The speech session ID
 * @returns The speech feedback response
 */
export const generateSpeechFeedback = async (sessionId: string): Promise<any> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/speech/feedback/${sessionId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        // Disable automatic CORS preflight requests
        withCredentials: false
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error generating speech feedback:', error);
    throw new Error('Failed to generate speech feedback');
  }
};

/**
 * Generate feedback for a visual session
 * @param sessionId The visual session ID
 * @returns The visual feedback response
 */
export const generateVisualFeedback = async (sessionId: string): Promise<any> => {
  try {
    console.log('Generating visual feedback for session:', sessionId);
    // Add longer delay to ensure analysis is complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const response = await axios.post(
      `${API_BASE_URL}/visual/feedback/${sessionId}`,
      null,  // Send null instead of empty object
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        withCredentials: false
      }
    );
    
    console.log('Visual feedback API response:', response.data);
    if (!response.data) {
      throw new Error('No data received from visual feedback endpoint');
    }
    return response.data;
  } catch (error) {
    console.error('Error generating visual feedback:', error);
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
 * @returns The speech feedback response
 */
export const getSpeechFeedback = async (sessionId: string): Promise<any> => {
  try {
    console.log('Getting speech feedback for session:', sessionId);
    const response = await axios.get(
      `${API_BASE_URL}/speech/sessions/${sessionId}/feedback`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        withCredentials: false
      }
    );
    
    console.log('Speech feedback response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting speech feedback:', error);
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
 * @returns The visual feedback response
 */
export const getVisualFeedback = async (sessionId: string): Promise<any> => {
  try {
    console.log('Getting visual feedback for session:', sessionId);
    const response = await axios.get(
      `${API_BASE_URL}/visual/sessions/${sessionId}/feedback`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        withCredentials: false
      }
    );
    
    console.log('Visual feedback response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting visual feedback:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw new Error(`Failed to get visual feedback: ${error.response?.data?.detail || error.message}`);
    }
    throw new Error('Failed to get visual feedback: Unknown error');
  }
};

export const getSpeechSession = async (sessionId: string): Promise<any> => {
  try {
    console.log('Getting speech session:', sessionId);
    const response = await axios.get(
      `${API_BASE_URL}/speech/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        withCredentials: false
      }
    );
    
    console.log('Speech session response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting speech session:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw new Error(`Failed to get speech session: ${error.response?.data?.detail || error.message}`);
    }
    throw new Error('Failed to get speech session: Unknown error');
  }
};

export const getVisualSession = async (sessionId: string): Promise<any> => {
  try {
    console.log('Getting visual session:', sessionId);
    const response = await axios.get(
      `${API_BASE_URL}/visual/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        withCredentials: false
      }
    );
    
    console.log('Visual session response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting visual session:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw new Error(`Failed to get visual session: ${error.response?.data?.detail || error.message}`);
    }
    throw new Error('Failed to get visual session: Unknown error');
  }
}; 