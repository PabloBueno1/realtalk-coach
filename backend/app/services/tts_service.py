import os
import openai
import tempfile
import json
from typing import Dict, Any, Optional
from pydub import AudioSegment
from dotenv import load_dotenv
import uuid

# Load environment variables from .env file
load_dotenv()

class TTSService:
    """
    Service for handling text-to-speech conversion using OpenAI's TTS API.
    Includes functionality for audio conversion, transcription, and speech generation.
    """

    def __init__(self):
        # Initialize with API key from environment
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            print("Warning: OPENAI_API_KEY environment variable is not set")

    def convert_to_wav(self, input_path: str, output_path: str = None) -> Optional[str]:
        """
        Convert input audio file to WAV format.
        
        Args:
            input_path: Path to input audio file
            output_path: Path to save WAV file (default: None, will use input_path with .wav extension)
            
        Returns:
            Path to converted WAV file or None if conversion fails
        """
        try:
            # If no output path is provided, use the input path with .wav extension
            if output_path is None:
                # Extract the base name without extension
                base_name = os.path.splitext(input_path)[0]
                output_path = f"{base_name}.wav"
                
            audio = AudioSegment.from_file(input_path)
            audio.export(output_path, format="wav")
            return output_path
        except Exception as e:
            print(f"Error converting audio to WAV: {str(e)}")
            return None

    def transcribe_audio(self, audio_path: str) -> Optional[str]:
        """
        Transcribe audio file using OpenAI's Whisper API.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Transcribed text or None if transcription fails
        """
        try:
            if not self.api_key:
                raise ValueError("OPENAI_API_KEY environment variable is not set")
                
            with open(audio_path, "rb") as f:
                client = openai.OpenAI(api_key=self.api_key)
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f
                )
            return transcript.text
        except Exception as e:
            print(f"Error during transcription: {str(e)}")
            return None

    def generate_reply(self, transcript: str, conversation_history: list = None, scenario: Dict[str, Any] = None) -> Optional[str]:
        """
        Generate a conversational reply using GPT-4.
        
        Args:
            transcript: Input text to generate reply for
            conversation_history: List of previous messages in the conversation
            scenario: Scenario context for the conversation
            
        Returns:
            Generated reply text or None if generation fails
        """
        try:
            # Extract scenario details
            title = scenario.get("title", "Casual Conversation") if scenario else "Casual Conversation"
            description = scenario.get("description", "A general conversation practice session") if scenario else "A general conversation practice session"
            initial_prompt = scenario.get("initial_prompt", "How have you been?") if scenario else "How have you been?"
            context = scenario.get("context", "A natural conversation setting") if scenario else "A natural conversation setting"
            difficulty_level = scenario.get("difficulty_level", "intermediate") if scenario else "intermediate"
            
            # Prepare system message with scenario context
            system_message = f"""You are a normal person having a conversation in the following scenario:

Title: {title}
Description: {description}
Initial Prompt: {initial_prompt}
Context: {context}
Difficulty Level: {difficulty_level}

Respond naturally as if you're talking to a friend - share personal stories, opinions, and emotions. 
Never mention anything about being digital, AI, technology, or virtual. 
Pretend you have a normal life with normal experiences - job, family, friends, hobbies, etc. 
Keep the conversation flowing naturally and authentically, staying within the context of the scenario.

IMPORTANT: Keep your responses concise and focused. Aim for 2-3 sentences maximum. 
This helps maintain a natural back-and-forth conversation flow and prevents overly long monologues.
"""
            
            # Prepare messages with history
            messages = [
                {"role": "system", "content": system_message}
            ]
            
            # Add conversation history if provided
            if conversation_history:
                # Add last 5 messages for context (to avoid token limits)
                messages.extend(conversation_history[-5:])
            
            # Add current message
            messages.append({"role": "user", "content": transcript})
            
            client = openai.OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                temperature=0.9,  # Increased for more creative and varied responses
                max_tokens=400
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error generating reply: {str(e)}")
            return None

    def speak_reply(self, text: str, conversation_id: str = None) -> Optional[str]:
        """
        Convert text to speech using OpenAI's TTS API.
        
        Args:
            text: Text to convert to speech
            conversation_id: ID of the conversation (used for filename)
            
        Returns:
            Path to generated audio file or None if generation fails
        """
        try:
            # Generate a unique filename
            filename = f"{uuid.uuid4()}"
            
            # Add conversation ID to filename if provided
            if conversation_id:
                filename = f"{filename}_{conversation_id}"
                
            filename = f"{filename}.mp3"
            audio_path = f"audio/{filename}"
            
            client = openai.OpenAI(api_key=self.api_key)
            speech = client.audio.speech.create(
                model="tts-1",
                voice="nova",
                input=text
            )
            with open(audio_path, "wb") as out:
                out.write(speech.content)
            
            # Return the URL path that can be accessed by the frontend
            return f"/audio/{filename}"
        except Exception as e:
            print(f"Error generating speech: {str(e)}")
            return None

    def process_clip(self, input_audio_path: str, conversation_history: list = None, conversation_id: str = None, scenario: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process an audio clip through the complete pipeline:
        1. Convert to WAV
        2. Transcribe
        3. Generate reply
        4. Convert reply to speech
        
        Args:
            input_audio_path: Path to input audio file
            conversation_history: List of previous messages in the conversation
            conversation_id: ID of the conversation (used for filenames)
            scenario: Scenario context for the conversation
            
        Returns:
            Dictionary containing transcript, reply, and audio path
        """
        print("🎧 Converting input to WAV format...")
        wav_path = self.convert_to_wav(input_audio_path)
        if not wav_path:
            return {"error": "Failed to convert audio to WAV"}

        print("🔤 Transcribing with Whisper...")
        transcript = self.transcribe_audio(wav_path)
        if not transcript:
            return {"error": "Failed to transcribe audio"}
        print(f"🗣️ Transcript: {transcript}")

        print("🤖 Generating conversational reply...")
        reply = self.generate_reply(transcript, conversation_history, scenario)
        if not reply:
            return {"error": "Failed to generate reply"}
        print(f"💬 Reply: {reply}")
            
        print("🔊 Creating TTS reply...")
        reply_audio_path = self.speak_reply(reply, conversation_id)
        if not reply_audio_path:
            return {"error": "Failed to generate speech"}
        print(f"✅ Reply saved to: {reply_audio_path}")

        return {
            "transcript": transcript,
            "reply": reply,
            "reply_audio_path": reply_audio_path
        }

if __name__ == "__main__":
    # Test conversation history
    conversation_history = [
        # {"role": "user", "content": "Hi, how are you doing today?"},
        # {"role": "assistant", "content": "I'm doing great! Just finished a nice walk in the park. How about you?"},
        # {"role": "user", "content": "I'm good, just working on some projects. What kind of projects do you work on?"}
    ]

    # Test with conversation history
    print("\n🧪 Testing with conversation history...")
    input_audio_path = "shortclip1.mp4"  # Your test audio file
    service = TTSService()
    
    # First response with history
    result1 = service.process_clip(input_audio_path, conversation_history)
    print("\n🎯 First Response:")
    print(json.dumps(result1, indent=2))
    
    # Update conversation history with the new exchange
    conversation_history.append({"role": "user", "content": result1["transcript"]})
    conversation_history.append({"role": "assistant", "content": result1["reply"]})
    
    # Second response with updated history
    print("\n🧪 Testing with updated conversation history...")
    result2 = service.process_clip(input_audio_path, conversation_history)
    print("\n🎯 Second Response:")
    print(json.dumps(result2, indent=2))
