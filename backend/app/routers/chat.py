from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.responses import FileResponse
from typing import Dict, List, Optional, Any
import uuid
import os
import glob
from app.services.tts_service import TTSService
from app.config import supabase, check_user_tokens, decrement_user_tokens

router = APIRouter()

# Endpoint to serve audio files
@router.get("/audio/{filename}")
async def get_audio_file(filename: str):
    file_path = f"audio/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path)

class ConversationManager:
    def __init__(self):
        self.active_conversations: Dict[str, Dict[str, Any]] = {}
    
    def create_conversation(self, scenario_id: Optional[str] = None) -> str:
        conversation_id = str(uuid.uuid4())
        self.active_conversations[conversation_id] = {
            "messages": [],
            "scenario_id": scenario_id
        }
        return conversation_id
    
    def add_to_history(self, conversation_id: str, user_message: str, assistant_message: str):
        if conversation_id in self.active_conversations:
            self.active_conversations[conversation_id]["messages"].extend([
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_message}
            ])
    
    def get_history(self, conversation_id: str) -> List[dict]:
        return self.active_conversations.get(conversation_id, {}).get("messages", [])
    
    def get_scenario_id(self, conversation_id: str) -> Optional[str]:
        return self.active_conversations.get(conversation_id, {}).get("scenario_id")
    
    def remove_conversation(self, conversation_id: str):
        if conversation_id in self.active_conversations:
            del self.active_conversations[conversation_id]

# Function to clean up temporary files
def cleanup_temp_files(conversation_id: str):
    # Clean up any audio files in the audio directory that were created for this conversation
    audio_files = glob.glob(f"audio/*_{conversation_id}.mp3")
    for audio_file in audio_files:
        try:
            os.remove(audio_file)
            print(f"Cleaned up audio file: {audio_file}")
        except Exception as e:
            print(f"Error cleaning up audio file: {str(e)}")

conversation_manager = ConversationManager()

@router.websocket("/ws/chat")
async def websocket_endpoint(
    websocket: WebSocket,
    access_token: Optional[str] = Query(None),
    scenario_id: Optional[str] = Query(None)
):
    # Debug logging
    print(f"WebSocket connection attempt with auth token: {access_token is not None}")
    print(f"WebSocket headers: {websocket.headers}")
    print(f"WebSocket query params: {websocket.query_params}")
    
    # Check authentication
    if not access_token:
        print("Authentication failed: No auth token provided")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
        return
    
    try:
        # Verify the auth token with Supabase
        print(f"Verifying auth token with Supabase")
        user_response = supabase.auth.get_user(access_token)
        if not user_response.user:
            print("Authentication failed: Invalid auth token (no user found)")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
            return
            
        # Check if user has usage tokens available
        has_usage_tokens = await check_user_tokens(user_response.user.id)
        if not has_usage_tokens:
            print("User has no usage tokens available")
            # Accept the connection temporarily to send the error message
            await websocket.accept()
            await websocket.send_json({
                "error": "You have no usage tokens available. Please upgrade your plan to continue."
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="No usage tokens available")
            return
            
        # Decrement one usage token for the entire session
        if not await decrement_user_tokens(user_response.user.id):
            print("Failed to decrement usage token")
            # Accept the connection temporarily to send the error message
            await websocket.accept()
            await websocket.send_json({
                "error": "Failed to process your usage token. Please try again."
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Failed to process usage token")
            return
            
        print(f"Authentication successful for user: {user_response.user.email}")
    except Exception as e:
        print(f"Authentication failed with error: {str(e)}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Authentication failed: {str(e)}")
        return
    
    # Accept the connection if authentication is successful
    try:
        await websocket.accept()
        print("WebSocket connection accepted")
    except Exception as e:
        print(f"Failed to accept WebSocket connection: {str(e)}")
        return
    
    conversation_id = conversation_manager.create_conversation(scenario_id)
    
    # Create a new TTS service instance for this connection
    tts_service = TTSService()
    
    try:
        while True:
            # Receive audio data
            audio_bytes = await websocket.receive_bytes()
            
            try:
                # Get conversation history
                history = conversation_manager.get_history(conversation_id)
                
                # Get scenario if it exists
                scenario = None
                if scenario_id:
                    scenario_result = supabase.table("scenarios").select("*").eq("id", scenario_id).execute()
                    if scenario_result.data:
                        scenario = scenario_result.data[0]
                
                # Process the audio clip with TTS service
                result = tts_service.process_clip(
                    audio_bytes=audio_bytes,
                    conversation_history=history,
                    conversation_id=conversation_id,
                    scenario=scenario
                )
                
                # Check if there was an error
                if "error" in result:
                    print(f"Error in TTS service: {result['error']}")
                    await websocket.send_json({
                        "error": result["error"]
                    })
                    continue
                
                # Update conversation history with transcript
                conversation_manager.add_to_history(
                    conversation_id,
                    result["transcript"],
                    ""  # We'll add the full reply after streaming
                )
                
                # Stream the reply sentence by sentence
                full_reply = ""
                try:
                    # First, send the transcript
                    await websocket.send_json({
                        "transcript": result["transcript"],
                        "reply": ""
                    })
                    
                    # Then stream the reply
                    for sentence_data in result["reply_generator"]:
                        if sentence_data:
                            # Log the sentence before sending
                            print(f"Sending sentence: {sentence_data['sentence']}")
                            # Send each sentence with its audio
                            await websocket.send_json({
                                "sentence": sentence_data["sentence"]
                            })
                            await websocket.send_bytes(sentence_data["audio_bytes"])
                            full_reply += sentence_data["sentence"]
                except Exception as e:
                    print(f"Error streaming reply: {str(e)}")
                    await websocket.send_json({
                        "error": f"Error streaming reply: {str(e)}"
                    })
                    continue
                
                # Update conversation history with the complete reply
                conversation_manager.add_to_history(
                    conversation_id,
                    result["transcript"],
                    full_reply
                )
                
            except Exception as e:
                print(f"Error processing audio: {str(e)}")
                await websocket.send_json({
                    "error": f"Error processing audio: {str(e)}"
                })
                
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason=str(e)) 