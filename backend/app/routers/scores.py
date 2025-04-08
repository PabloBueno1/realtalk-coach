from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from ..config import get_current_user, get_supabase_client
from ..schemas import CombinedSessionResponse
import logging

router = APIRouter()

@router.get("/combined", response_model=List[CombinedSessionResponse])
async def get_combined_sessions(
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(5, ge=1, le=20, description="Number of items per page")
):
    """
    Get sessions with their speech and visual feedback in a single call, with pagination.
    """
    try:
        logging.info(f"Starting get_combined_sessions - Page {page}, Size {page_size}")
        supabase = await get_supabase_client()
        
        # Calculate offset for pagination
        offset = (page - 1) * page_size
        
        # Get speech sessions with pagination
        logging.info("Fetching speech sessions...")
        speech_response = supabase.table('speech_sessions') \
            .select('*, speech_gpt_feedback(*)') \
            .eq('user_id', current_user['id']) \
            .order('created_at', desc=True) \
            .range(offset, offset + page_size - 1) \
            .execute()
            
        logging.debug(f"Speech response: {speech_response}")
        
        if not speech_response.data:
            logging.error("No speech sessions found or error fetching speech sessions")
            raise HTTPException(status_code=500, detail="Error fetching speech sessions")
            
        logging.info(f"Found {len(speech_response.data)} speech sessions")
        
        # Get speech session IDs for this page
        speech_session_ids = [session['id'] for session in speech_response.data]
        
        # Get visual sessions for these speech sessions
        logging.info("Fetching visual sessions...")
        visual_response = supabase.table('visual_sessions') \
            .select('*') \
            .eq('user_id', current_user['id']) \
            .in_('id', speech_session_ids) \
            .execute()
            
        logging.debug(f"Visual response: {visual_response}")
        
        if not visual_response.data:
            logging.info("No visual sessions found for this page")
        else:
            logging.info(f"Found {len(visual_response.data)} visual sessions")
        
        # Get visual feedback for each visual session
        visual_sessions_with_feedback = []
        for visual_session in visual_response.data:
            feedback_response = supabase.table('visual_gpt_feedback') \
                .select('*') \
                .eq('session_id', visual_session['id']) \
                .execute()
                
            if feedback_response.data:
                visual_session['visual_gpt_feedback'] = feedback_response.data[0]
            else:
                visual_session['visual_gpt_feedback'] = None
                
            visual_sessions_with_feedback.append(visual_session)
        
        # Create a map of visual sessions by speech_session_id
        visual_sessions_map = {
            session['id']: session 
            for session in visual_sessions_with_feedback 
        }
        
        logging.debug(f"Visual sessions map: {visual_sessions_map}")
        logging.info(f"Found {len(visual_sessions_map)} visual sessions mapped to speech sessions")
        
        # Combine the data
        combined_sessions = []
        for speech_session in speech_response.data:
            try:
                logging.debug(f"Processing speech session {speech_session['id']}")
                # Handle None feedback values
                speech_feedback = speech_session.get('speech_gpt_feedback') or {}
                visual_session = visual_sessions_map.get(speech_session['id'])
                
                logging.debug(f"Speech feedback: {speech_feedback}")
                logging.debug(f"Found visual session: {visual_session is not None}")
                
                if visual_session:
                    logging.debug(f"Visual session ID: {visual_session['id']}")
                    visual_feedback_data = visual_session.get('visual_gpt_feedback')
                    logging.debug(f"Visual feedback data: {visual_feedback_data}")
                    if visual_feedback_data:
                        logging.debug(f"Visual feedback keys: {list(visual_feedback_data.keys())}")
                
                visual_feedback = (visual_session.get('visual_gpt_feedback') or {}) if visual_session else {}
                
                # Create speech data object
                speech_data = {
                    'id': speech_session['id'],
                    'user_id': speech_session['user_id'],
                    'scenario_id': speech_session.get('scenario_id'),
                    'created_at': speech_session['created_at'],
                    'transcript': speech_session.get('transcript'),
                    'word_count': speech_session.get('word_count'),
                    'total_duration': speech_session.get('total_duration'),
                    'speaking_time': speech_session.get('speaking_time'),
                    'speaking_rate': speech_session.get('speaking_rate'),
                    'average_volume_dbfs': speech_session.get('average_volume_dbfs'),
                    'num_pauses': speech_session.get('num_pauses')
                }
                
                # Create visual data object if available
                visual_data = None
                if visual_session:
                    visual_data = {
                        'id': visual_session['id'],
                        'user_id': visual_session['user_id'],
                        'scenario_id': visual_session.get('scenario_id'),
                        'created_at': visual_session['created_at'],
                        'eye_contact_percent': visual_session.get('eye_contact_percent', 0),
                        'smile_percent': visual_session.get('smile_percent', 0),
                        'visibility_percent': visual_session.get('visibility_percent', 0),
                        'posture_percent': visual_session.get('posture_percent', 0),
                        'emotion_distribution': visual_session.get('emotion_distribution', {}),
                        'total_frames_analyzed': visual_session.get('total_frames_analyzed', 0)
                    }
                
                # Calculate scores
                speech_score = float(speech_feedback.get('overall_score', 0))
                # Try different possible field names for visual score
                visual_score = 0.0
                if visual_session and visual_feedback:
                    visual_score = float(visual_feedback.get('overall_score', 
                                    visual_feedback.get('score', 
                                    visual_feedback.get('total_score', 0))))
                
                logging.debug(f"Speech score: {speech_score}")
                logging.debug(f"Visual score: {visual_score}")
                
                # Only include visual score in overall if we have both scores
                overall_score = speech_score
                if visual_session and visual_score > 0:
                    overall_score = (speech_score + visual_score) / 2
                
                combined_session = {
                    'id': speech_session['id'],
                    'created_at': speech_session['created_at'],
                    'module_id': speech_session.get('module_id', 1),
                    'module_title': get_module_title(speech_session.get('module_id', 1)),
                    'speech_data': speech_data,
                    'visual_data': visual_data,
                    'speech_score': speech_score,
                    'visual_score': visual_score,
                    'overall_score': overall_score
                }
                
                logging.debug(f"Final combined session: {combined_session}")
                combined_sessions.append(combined_session)
                
            except Exception as e:
                logging.error(f"Error processing session {speech_session.get('id')}: {str(e)}", exc_info=True)
                continue
            
        return combined_sessions
        
    except Exception as e:
        logging.error(f"Error in get_combined_sessions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

def get_module_title(module_id: int) -> str:
    module_titles = {
        1: 'Formal',
        2: 'Informal',
        3: 'Presentations',
        4: 'Networking',
    }
    return module_titles.get(module_id, f'Module {module_id}') 