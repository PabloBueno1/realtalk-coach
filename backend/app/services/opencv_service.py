import cv2
import json
import numpy as np
from pathlib import Path
from deepface import DeepFace
from typing import Dict, Any, Optional
from .gpt_feedback_service import generate_visual_feedback

class VisualAnalysisService:
    """
    Simplified visual analysis using OpenCV and DeepFace — no broken gaze tracking.
    Tracks face visibility, brightness, emotion, smiling, posture, and basic eye contact.
    """

    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    def analyze_video(self, video_path: str) -> Dict[str, Any]:
        try:
            print(f"Attempting to open video file: {video_path}")
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                print(f"Error: Could not open video file: {video_path}")
                return {}
            
            # Log video properties
            width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            fps = cap.get(cv2.CAP_PROP_FPS)
            codec = cap.get(cv2.CAP_PROP_FOURCC)
            print(f"Video properties: {width}x{height} @ {fps}fps, codec: {codec}")
            
            frame_interval = int(fps)
            frame_data = []
            frame_count = 0

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % frame_interval == 0:
                    entry = {}
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    brightness = gray.mean()
                    faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
                    entry["face_visible"] = len(faces) > 0
                    entry["brightness"] = brightness

                    if len(faces) > 0:
                        x, y, w, h = faces[0]
                        center_x = x + w / 2
                        frame_center_x = frame.shape[1] / 2
                        offset = abs(center_x - frame_center_x) / frame.shape[1]
                        entry["is_looking_center"] = offset < 0.15

                        aspect_ratio = h / w
                        entry["aspect_ratio"] = aspect_ratio
                        entry["posture_upright"] = aspect_ratio > 0.9
                    else:
                        entry["is_looking_center"] = False
                        entry["posture_upright"] = False
                        entry["aspect_ratio"] = 0

                    try:
                        result = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
                        emotion = result[0]['dominant_emotion']
                    except Exception as e:
                        print(f"Error detecting emotion: {str(e)}")
                        emotion = "unknown"

                    entry["emotion"] = emotion
                    entry["is_smiling"] = emotion == "happy"
                    frame_data.append(entry)

                frame_count += 1

            cap.release()

            if not frame_data:
                print(f"Warning: No frames were analyzed in the video: {video_path}")
                return {}

            return self._summarize_raw_metrics(frame_data)

        except Exception as e:
            print(f"Error analyzing video: {str(e)}")
            return {}

    def _summarize_raw_metrics(self, frame_data: list) -> Dict[str, Any]:
        num_frames = len(frame_data)
        if num_frames == 0:
            return {}

        emotions = [f["emotion"] for f in frame_data if f["emotion"] != "unknown"]
        unique_emotions = set(emotions)

        eye_contact_percent = sum(1 for f in frame_data if f["is_looking_center"]) / num_frames * 100
        smile_percent = sum(1 for f in frame_data if f["is_smiling"]) / num_frames * 100
        visibility_percent = sum(1 for f in frame_data if f["face_visible"] and f["brightness"] > 50) / num_frames * 100
        posture_percent = sum(1 for f in frame_data if f.get("posture_upright", False)) / num_frames * 100
        emotion_distribution = {emotion: emotions.count(emotion) for emotion in unique_emotions}

        return {
            "eye_contact_percent": round(eye_contact_percent, 2),
            "smile_percent": round(smile_percent, 2),
            "visibility_percent": round(visibility_percent, 2),
            "posture_percent": round(posture_percent, 2),
            "emotion_distribution": emotion_distribution,
            "total_frames_analyzed": num_frames
        }

    def export_metrics_to_json(self, metrics: Dict[str, Any], output_path: str) -> bool:
        try:
            with open(output_path, "w") as f:
                json.dump(metrics, f, indent=2)
            return True
        except Exception as e:
            print(f"Error exporting metrics to JSON: {str(e)}")
            return False

if __name__ == "__main__":
    service = VisualAnalysisService()
    video_path = str(Path(__file__).parent / "rasheltest.mp4")

    print("🔍 Analyzing video...")
    try:
        visual_metrics = service.analyze_video(video_path)
        print("\n🎯 Visual Metrics:")
        print(json.dumps(visual_metrics, indent=2))

        if service.export_metrics_to_json(visual_metrics, "visual_metrics.json"):
            print("\n📦 Metrics saved to visual_metrics.json")
        else:
            print("❌ Failed to save metrics.")
            
        # Generate visual feedback using GPT
        print("\n🤖 Generating visual feedback...")
        feedback_text, feedback_scores = generate_visual_feedback(visual_metrics)
        
        print("\n📝 Visual Feedback:")
        print(feedback_text)
        
        print("\n📊 Feedback Scores:")
        print(json.dumps(feedback_scores, indent=2))
        
        # Save feedback to JSON
        feedback_data = {
            "feedback_text": feedback_text,
            "feedback_scores": feedback_scores
        }
        
        with open("visual_feedback.json", "w") as f:
            json.dump(feedback_data, f, indent=2)
        print("\n📦 Feedback saved to visual_feedback.json")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
