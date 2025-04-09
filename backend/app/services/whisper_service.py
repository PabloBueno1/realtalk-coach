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
        Extract audio from video file (e.g., .mp4 to .wav)
        """
        try:
            # Check file extension to determine format
            file_extension = os.path.splitext(video_path)[1].lower()
            print(f"Extracting audio from file with extension: {file_extension}")
            
            # Special handling for WebM files
            if file_extension == '.webm':
                print("Detected WebM file, using special handling...")
                try:
                    # Use ffmpeg directly to extract audio from WebM
                    import subprocess
                    temp_output = f"{os.path.splitext(output_path)[0]}_temp.wav"
                    
                    # Extract audio only from WebM with more robust settings
                    cmd = [
                        "ffmpeg", 
                        "-i", video_path, 
                        "-vn",  # No video
                        "-acodec", "pcm_s16le",  # PCM 16-bit
                        "-ar", "16000",  # 16kHz sample rate
                        "-ac", "1",  # Mono
                        "-fflags", "+genpts+igndts+discardcorrupt",  # Ignore corrupt packets
                        "-err_detect", "ignore_err",  # Ignore errors
                        "-y",  # Overwrite output file
                        temp_output
                    ]
                    
                    print(f"Running command: {' '.join(cmd)}")
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    
                    if result.returncode != 0:
                        print(f"FFmpeg error: {result.stderr}")
                        # Try alternative approach with more aggressive error handling
                        print("Trying alternative approach with more aggressive error handling...")
                        alt_cmd = [
                            "ffmpeg", 
                            "-i", video_path, 
                            "-vn",  # No video
                            "-acodec", "pcm_s16le",  # PCM 16-bit
                            "-ar", "16000",  # 16kHz sample rate
                            "-ac", "1",  # Mono
                            "-fflags", "+genpts+igndts+discardcorrupt+fastseek",  # More aggressive error handling
                            "-err_detect", "ignore_err",  # Ignore errors
                            "-max_muxing_queue_size", "1024",  # Increase queue size
                            "-y",  # Overwrite output file
                            temp_output
                        ]
                        
                        print(f"Running alternative command: {' '.join(alt_cmd)}")
                        alt_result = subprocess.run(alt_cmd, capture_output=True, text=True)
                        
                        if alt_result.returncode != 0:
                            print(f"Alternative FFmpeg error: {alt_result.stderr}")
                            raise Exception(f"Both FFmpeg attempts failed")
                    
                    # Rename temp file to final output
                    if os.path.exists(temp_output):
                        if os.path.exists(output_path):
                            os.remove(output_path)
                        os.rename(temp_output, output_path)
                        print(f"Successfully extracted audio from WebM: {output_path}")
                        return True
                    else:
                        raise Exception("FFmpeg did not produce output file")
                        
                except Exception as e:
                    print(f"Error in WebM extraction: {str(e)}")
                    # Fall back to pydub if ffmpeg fails
            
            # Try to detect the file format
            try:
                # First attempt: try to load directly with pydub
                print(f"Attempting to load file directly with pydub...")
                audio = AudioSegment.from_file(video_path)
            except Exception as e1:
                print(f"First attempt failed: {str(e1)}")
                
                # Second attempt: try with explicit format based on extension
                try:
                    format_map = {
                        '.webm': 'webm',
                        '.mp4': 'mp4',
                        '.mp3': 'mp3',
                        '.wav': 'wav',
                        '.ogg': 'ogg',
                        '.m4a': 'm4a'
                    }
                    
                    format_to_use = format_map.get(file_extension, 'webm')
                    print(f"Second attempt: trying with explicit format '{format_to_use}'...")
                    audio = AudioSegment.from_file(video_path, format=format_to_use)
                except Exception as e2:
                    print(f"Second attempt failed: {str(e2)}")
                    
                    # Third attempt: try with raw data
                    try:
                        print("Third attempt: trying with raw PCM data...")
                        # Try to read as raw PCM data
                        with open(video_path, 'rb') as f:
                            audio = AudioSegment.from_raw(f.read(), sample_width=2, frame_rate=44100, channels=1)
                    except Exception as e3:
                        print(f"Third attempt failed: {str(e3)}")
                        raise Exception(f"All extraction attempts failed: {str(e1)}, {str(e2)}, {str(e3)}")
            
            # Export to WAV with specific parameters for better compatibility
            print(f"Exporting to WAV: {output_path}")
            audio = audio.set_frame_rate(16000).set_channels(1)  # Convert to 16kHz mono
            audio.export(output_path, format="wav")
            print(f"Successfully exported to WAV: {output_path}")
            return True
        except Exception as e:
            print(f"Error extracting audio from video: {str(e)}")
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
