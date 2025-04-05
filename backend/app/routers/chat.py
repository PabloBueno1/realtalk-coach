from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import uuid
import os
from app.services.tts_service import TTSService

router = APIRouter()

class ConversationManager:
    def __init__(self):
        self.active_conversations: Dict[str, List[dict]] = {}
    
    def create_conversation(self) -> str:
        conversation_id = str(uuid.uuid4())
        self.active_conversations[conversation_id] = []
        return conversation_id
    
    def add_to_history(self, conversation_id: str, user_message: str, assistant_message: str):
        if conversation_id in self.active_conversations:
            self.active_conversations[conversation_id].extend([
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_message}
            ])
    
    def get_history(self, conversation_id: str) -> List[dict]:
        return self.active_conversations.get(conversation_id, [])
    
    def remove_conversation(self, conversation_id: str):
        if conversation_id in self.active_conversations:
            del self.active_conversations[conversation_id]

conversation_manager = ConversationManager()
tts_service = TTSService()

@router.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    conversation_id = conversation_manager.create_conversation()
    
    try:
        while True:
            # Receive audio data
            audio_data = await websocket.receive_bytes()
            
            # Save audio temporarily
            temp_path = f"temp_{conversation_id}.mp4"
            with open(temp_path, "wb") as f:
                f.write(audio_data)
            
            try:
                # Get conversation history
                history = conversation_manager.get_history(conversation_id)
                
                # Process with TTS service
                result = tts_service.process_clip(temp_path, history)
                
                # Update conversation history
                conversation_manager.add_to_history(
                    conversation_id,
                    result["transcript"],
                    result["reply"]
                )
                
                # Send response back
                await websocket.send_json({
                    "transcript": result["transcript"],
                    "reply": result["reply"],
                    "audio_path": result["reply_audio_path"]
                })
                
            finally:
                # Cleanup temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
    except WebSocketDisconnect:
        # Cleanup when connection closes
        conversation_manager.remove_conversation(conversation_id)
    except Exception as e:
        # Handle other errors
        await websocket.send_json({
            "error": str(e)
        })
        conversation_manager.remove_conversation(conversation_id) 