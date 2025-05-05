import { supabase } from '../lib/supabase';

// Replace the hardcoded API_BASE_URL with the environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL;

/**
 * Analyze speech from a video file
 * @param videoBlob The video file to analyze
 * @param scenarioId Optional scenario ID to associate with the analysis
 * @returns The speech session response
 */
export const analyzeSpeech = async (videoBlob: Blob, scenarioId?: string): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', videoBlob);
    if (scenarioId) {
      formData.append('scenario_id', scenarioId);
    }

    // Supabase storage upload
    const fileName = `speech_analysis_${Date.now()}.webm`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('analysis_files')
      .upload(fileName, videoBlob);

    if (uploadError) throw uploadError;

    // Insert record for analysis
    const { data, error } = await supabase
      .from('speech_sessions')
      .insert({
        file_path: uploadData?.path,
        scenario_id: scenarioId
      })
      .select()
      .single();

    if (error) throw error;
    
    return data;
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
    // Supabase storage upload
    const fileName = `visual_analysis_${Date.now()}.webm`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('analysis_files')
      .upload(fileName, videoBlob);

    if (uploadError) throw uploadError;

    // Insert record for analysis
    const { data, error } = await supabase
      .from('visual_sessions')
      .insert({
        file_path: uploadData?.path,
        speech_session_id: speechSessionId
      })
      .select()
      .single();

    if (error) throw error;
    
    return data;
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
    // Insert feedback request
    const { data, error } = await supabase
      .from('speech_feedback')
      .insert({
        session_id: sessionId,
        status: 'requested'
      })
      .select()
      .single();

    if (error) throw error;
    
    return data;
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
    // Add longer delay to ensure analysis is complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Insert feedback request
    const { data, error } = await supabase
      .from('visual_feedback')
      .insert({
        session_id: sessionId,
        status: 'requested'
      })
      .select()
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error generating visual feedback:', error);
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
    const { data, error } = await supabase
      .from('speech_feedback')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting speech feedback:', error);
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
    const { data, error } = await supabase
      .from('visual_feedback')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting visual feedback:', error);
    throw new Error('Failed to get visual feedback: Unknown error');
  }
};

export const getSpeechSession = async (sessionId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('speech_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting speech session:', error);
    throw new Error('Failed to get speech session: Unknown error');
  }
};

export const getVisualSession = async (sessionId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('visual_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting visual session:', error);
    throw new Error('Failed to get visual session: Unknown error');
  }
};

/**
 * Get combined speech session and feedback data
 * @param sessionId The speech session ID
 * @returns The combined speech session and feedback response
 */
export const getCombinedSpeechAnalysis = async (sessionId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('speech_sessions')
      .select(`
        *,
        speech_feedback(*)
      `)
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting combined speech analysis:', error);
    throw new Error('Failed to get combined speech analysis: Unknown error');
  }
};

/**
 * Get combined visual session and feedback data
 * @param sessionId The visual session ID
 * @returns The combined visual session and feedback response
 */
export const getCombinedVisualAnalysis = async (sessionId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('visual_sessions')
      .select(`
        *,
        visual_feedback(*)
      `)
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting combined visual analysis:', error);
    throw new Error('Failed to get combined visual analysis: Unknown error');
  }
}; 