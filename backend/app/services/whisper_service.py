import os
import openai
import tempfile
import requests
import json
import numpy as np
import soundfile as sf
from typing import Optional, Dict, Any
from pydub import AudioSegment
from pydub.silence import detect_nonsilent, detect_silence
import librosa
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variable
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Warning: OPENAI_API_KEY environment variable is not set")

class WhisperService:
    def __init__(self):
        # Initialize with API key from environment
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            print("Warning: OPENAI_API_KEY environment variable is not set")
            
    def transcribe_audio(self, audio_path: str) -> Optional[str]:
        """
        Transcribe a local audio file using OpenAI's Whisper API.
        """
        try:
            # Use the API key from the instance
            if not self.api_key:
                raise ValueError("OPENAI_API_KEY environment variable is not set")
                
            with open(audio_path, 'rb') as f:
                # Use the new OpenAI API format
                client = openai.OpenAI(api_key=self.api_key)
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f
                )
            return transcript.text
        except Exception as e:
            print(f"Error during transcription: {str(e)}")
            return None

    def analyze_audio(self, audio_path: str) -> Dict[str, Any]:
        """
        Analyze audio file and return speech metrics.
        """
        try:
            # Load audio with pydub
            audio = AudioSegment.from_file(audio_path)
            average_volume = audio.dBFS
            total_duration = len(audio) / 1000  # milliseconds → seconds

            # Speaking time
            nonsilent = detect_nonsilent(audio, min_silence_len=300, silence_thresh=-40)
            speaking_time = sum((end - start) for start, end in nonsilent) / 1000

            # Silence metrics
            silent_chunks = detect_silence(audio, min_silence_len=300, silence_thresh=-40)
            num_pauses = len(silent_chunks)

            # Transcribe
            transcript = self.transcribe_audio(audio_path)
            word_count = len(transcript.split()) if transcript else 0
            speaking_rate = word_count / speaking_time if speaking_time > 0 else 0

            return {
                "transcript": transcript,
                "word_count": word_count,
                "total_duration": total_duration,
                "speaking_time": speaking_time,
                "speaking_rate": speaking_rate,
                "average_volume_dbfs": average_volume,
                "num_pauses": num_pauses,
            }

        except Exception as e:
            print(f"Error analyzing audio: {str(e)}")
            return {}

    def extract_audio_from_video(self, video_path: str, output_path: str) -> bool:
        """
        Extract audio from video file using ffmpeg
        """
        try:
            import subprocess
            
            # Use ffmpeg to extract audio with consistent settings
            cmd = [
                "ffmpeg", 
                "-i", video_path, 
                "-vn",  # No video
                "-acodec", "pcm_s16le",  # PCM 16-bit
                "-ar", "16000",  # 16kHz sample rate
                "-ac", "1",  # Mono
                "-y",  # Overwrite output file
                output_path
            ]
            
            print(f"Running ffmpeg command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"FFmpeg error: {result.stderr}")
                return False
                
            print(f"Successfully extracted audio to: {output_path}")
            return True
            
        except Exception as e:
            print(f"Error extracting audio: {str(e)}")
            return False

    def export_metrics_to_json(self, metrics: Dict[str, Any], output_path: str) -> bool:
        """
        Save audio metrics to a JSON file.
        """
        try:
            with open(output_path, "w") as f:
                json.dump(metrics, f, indent=2)
            return True
        except Exception as e:
            print(f"Error exporting metrics to JSON: {str(e)}")
            return False

# -------------------------
# ✅ Test Script
# -------------------------

if __name__ == "__main__":
    service = WhisperService()

    # Test 1: Extract audio from video
    video_path = "rasheltest.mp4"
    audio_path = "temp_audio.wav"
    if service.extract_audio_from_video(video_path, audio_path):
        print("✅ Audio extracted.")

        # Test 2: Analyze audio
        metrics = service.analyze_audio(audio_path)
        print("🎯 Audio Metrics:")
        print(json.dumps(metrics, indent=2))

        # Test 3: Export to JSON
        service.export_metrics_to_json(metrics, "audio_metrics.json")
        print("📦 Metrics saved to audio_metrics.json")

    else:
        print("❌ Failed to extract audio.")
