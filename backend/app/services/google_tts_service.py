import os
from google.cloud import texttospeech
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class GoogleTTSService:
    """
    Service for handling text-to-speech conversion using Google Cloud TTS API.
    """
    
    def __init__(self):
        # Initialize the client
        self.client = texttospeech.TextToSpeechClient()
        
        # Voice configuration
        self.voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Neural2-F",  # Using Neural2 voice for better quality
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
        )
        
        # Audio configuration
        self.audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.2,  # Increased from 1.0 to 1.2 (20% faster)
            pitch=0.0,  # Normal pitch
            volume_gain_db=0.0  # Normal volume
        )
    
    def text_to_speech(self, text: str) -> Optional[bytes]:
        """
        Convert text to speech using Google Cloud TTS API.
        
        Args:
            text: Text to convert to speech
            
        Returns:
            Audio bytes or None if generation fails
        """
        try:
            # Set the text input to be synthesized
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Perform the text-to-speech request
            response = self.client.synthesize_speech(
                input=synthesis_input,
                voice=self.voice,
                audio_config=self.audio_config
            )
            
            # Return the audio content
            return response.audio_content
            
        except Exception as e:
            print(f"Error generating speech with Google TTS: {str(e)}")
            return None 