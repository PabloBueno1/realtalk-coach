from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from ..config import get_current_user, get_supabase_client
from ..schemas import CombinedSessionResponse
import logging

router = APIRouter()

def get_speech_sessions(supabase, user_id: str, page: int, page_size: int) -> Dict[str, Any]:
    """Fetch paginated speech sessions with their feedback and scenarios."""
    offset = (page - 1) * page_size
    
    response = supabase.table('speech_sessions') \
        .select('*, speech_gpt_feedback(*), scenarios(title)') \
        .eq('user_id', user_id) \
        .order('created_at', desc=True) \
        .range(offset, offset + page_size - 1) \
        .execute()
        
    return response

def get_visual_sessions(supabase, user_id: str, speech_session_ids: List[str]) -> Dict[str, Any]:
    """Fetch visual sessions and their feedback for given speech session IDs."""
    response = supabase.table('visual_sessions') \
        .select('*') \
        .eq('user_id', user_id) \
        .in_('id', speech_session_ids) \
        .execute()
        
    return response

def get_visual_feedback(supabase, visual_session_id: str) -> Optional[Dict[str, Any]]:
    """Fetch visual feedback for a specific visual session."""
    response = supabase.table('visual_gpt_feedback') \
        .select('*') \
        .eq('session_id', visual_session_id) \
        .execute()
        
    return response.data[0] if response.data else None

def create_speech_data(speech_session: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized speech data object."""
    return {
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

def create_visual_data(visual_session: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized visual data object."""
    return {
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

def calculate_scores(speech_feedback: Dict[str, Any], visual_feedback: Optional[Dict[str, Any]]) -> Dict[str, float]:
    """Calculate speech, visual, and overall scores."""
    speech_score = float(speech_feedback.get('overall_score', 0))
    visual_score = 0.0
    
    if visual_feedback:
        visual_score = float(visual_feedback.get('overall_score', 0))
    
    overall_score = speech_score
    if visual_score > 0:
        overall_score = (speech_score + visual_score) / 2
    
    return {
        'speech_score': speech_score,
        'visual_score': visual_score,
        'overall_score': overall_score
    }

def create_combined_session(
    speech_session: Dict[str, Any],
    visual_session: Optional[Dict[str, Any]],
    speech_feedback: Dict[str, Any],
    visual_feedback: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """Create a combined session response object."""
    scores = calculate_scores(speech_feedback, visual_feedback)
    
    return {
        'id': speech_session['id'],
        'created_at': speech_session['created_at'],
        'module_id': str(speech_session.get('scenario_id', '')),
        'module_title': speech_session.get('scenarios', {}).get('title', 'Unknown Scenario'),
        'speech_data': create_speech_data(speech_session),
        'visual_data': create_visual_data(visual_session) if visual_session else None,
        'speech_score': scores['speech_score'],
        'visual_score': scores['visual_score'],
        'overall_score': scores['overall_score']
    }

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
        logging.info(f"Current user ID: {current_user['id']}")
        supabase = await get_supabase_client()
        
        # First, let's check if there are any speech sessions at all
        logging.info("Checking for any speech sessions...")
        all_speech_response = supabase.table('speech_sessions') \
            .select('id') \
            .eq('user_id', current_user['id']) \
            .execute()
            
        logging.info(f"Total speech sessions found: {len(all_speech_response.data)}")
        logging.info(f"All speech session IDs: {[session['id'] for session in all_speech_response.data]}")
        
        # Get speech sessions with pagination
        speech_response = get_speech_sessions(supabase, current_user['id'], page, page_size)
        
        if not speech_response.data:
            logging.info("No speech sessions found")
            return []
        
        # Get speech session IDs for this page
        speech_session_ids = [session['id'] for session in speech_response.data]
        
        # Get visual sessions for these speech sessions
        visual_response = get_visual_sessions(supabase, current_user['id'], speech_session_ids)
        
        # Process visual sessions and get their feedback
        visual_sessions_with_feedback = []
        for visual_session in visual_response.data or []:
            feedback = get_visual_feedback(supabase, visual_session['id'])
            visual_session['visual_gpt_feedback'] = feedback
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
                
                combined_session = create_combined_session(
                    speech_session,
                    visual_session,
                    speech_feedback,
                    visual_feedback
                )
                
                logging.debug(f"Final combined session: {combined_session}")
                combined_sessions.append(combined_session)
                
            except Exception as e:
                logging.error(f"Error processing session {speech_session.get('id')}: {str(e)}", exc_info=True)
                continue
            
        return combined_sessions
        
    except Exception as e:
        logging.error(f"Error in get_combined_sessions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e)) 