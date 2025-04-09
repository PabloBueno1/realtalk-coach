import os
import requests
import json
import random
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ElevenLabsService:
    """
    Service for handling text-to-speech conversion using ElevenLabs API.
    """
    
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        if not self.api_key:
            print("Warning: ELEVENLABS_API_KEY environment variable is not set")
        
        self.base_url = "https://api.elevenlabs.io/v1"
        self.default_voice_id = "21m00Tcm4TlvDq8ikWAM"  # Default voice ID (Rachel)
        self._voices = None  # Cache for voices list
        self.selected_voice_id = None  # Store the selected voice ID for the conversation
        
    def get_voices(self) -> list:
        """
        Get list of available voices.
        """
        try:
            if self._voices is None:
                response = requests.get(
                    f"{self.base_url}/voices",
                    headers={"xi-api-key": self.api_key}
                )
                response.raise_for_status()
                self._voices = response.json()["voices"]
            return self._voices
        except Exception as e:
            print(f"Error getting voices: {str(e)}")
            return []
            
    def get_random_voice(self) -> str:
        """
        Get a random voice ID from available voices.
        Returns the default voice ID if no voices are available.
        """
        voices = self.get_voices()
        if not voices:
            return self.default_voice_id
        return random.choice(voices)["voice_id"]
            
    def select_voice_for_conversation(self) -> str:
        """
        Select a random voice for the conversation and store it.
        Returns the selected voice ID.
        """
        self.selected_voice_id = self.get_random_voice()
        return self.selected_voice_id
            
    def text_to_speech(self, text: str, voice_id: str = None, output_path: str = None) -> Optional[str]:
        """
        Convert text to speech using ElevenLabs API.
        
        Args:
            text: Text to convert to speech
            voice_id: ID of the voice to use (default: conversation's selected voice)
            output_path: Path to save the audio file
            
        Returns:
            Path to the generated audio file or None if generation fails
        """
        try:
            if not self.api_key:
                raise ValueError("ELEVENLABS_API_KEY environment variable is not set")
                
            # Use conversation's selected voice if none specified
            voice_id = voice_id or self.selected_voice_id or self.default_voice_id
            
            # Prepare the request
            url = f"{self.base_url}/text-to-speech/{voice_id}"
            
            headers = {
                "xi-api-key": self.api_key,
                "Content-Type": "application/json"
            }
            
            data = {
                "text": text,
                "model_id": "eleven_flash_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }
            
            # Make the API request
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            # If no output path specified, create one
            if not output_path:
                output_path = "temp_elevenlabs.mp3"
            
            # Save the audio file
            with open(output_path, "wb") as f:
                f.write(response.content)
                
            return output_path
            
        except Exception as e:
            print(f"Error generating speech with ElevenLabs: {str(e)}")
            return None 