import os
import openai
import json
from typing import Dict, Any, Tuple
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variable
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Warning: OPENAI_API_KEY environment variable is not set")

def analyze_text_feedback_from_json(data: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
    """
    Given a JSON dict containing 'transcript' and 'metrics', return GPT feedback.
    Returns a tuple of (text_feedback, scores_dict)
    """
    try:
        transcript = data["transcript"]
        metrics = data["metrics"]
        
        # Default scenario for normal conversation
        scenario = "This is a normal conversation. Please evaluate the speaking style and content."
        
        # Ensure all metrics are properly formatted
        total_duration = float(metrics.get('total_duration', 0))
        speaking_time = float(metrics.get('speaking_time', 0))
        speaking_rate = float(metrics.get('speaking_rate', 0))
        average_volume = float(metrics.get('average_volume_dbfs', 0))
        num_pauses = int(metrics.get('num_pauses', 0))
        word_count = int(metrics.get('word_count', 0))

        prompt = f"""
You are an expert communication and speaking coach.

A user has submitted a video response to a practice scenario. You are provided with:
- The original scenario prompt
- The user's transcribed response
- A set of audio delivery metrics

Please evaluate their entire performance.

Your task:
1. Write a comprehensive, supportive feedback summary (3–6 sentences) that addresses:
   - The quality of the content: how well the user answered the prompt
   - Speaking fluency, clarity, and confidence
   - Pacing: was the speaking rate too fast or too slow?
   - Volume: was the voice audible and consistent?
   - Use of pauses: did they pause naturally or disrupt the flow?

2. Then, return objective scores (from 1 to 5) in a JSON format with the following keys:
   - fluency_score
   - confidence_score
   - clarity_score
   - content_score
   - pace_score
   - volume_score
   - pause_score
   - overall_score

Format your response like this:

Written Feedback:
<Your feedback here>

Scores (JSON):
{{
  "fluency_score": ...,
  "confidence_score": ...,
  "clarity_score": ...,
  "content_score": ...,
  "pace_score": ...,
  "volume_score": ...,
  "pause_score": ...,
  "overall_score": ...
}}

Here is the input data:

Scenario Prompt:
"{scenario or 'No prompt provided'}"

Transcript:
"{transcript or 'No transcript available'}"

Audio Analysis:
- Word count: {int(word_count)}
- Total duration: {float(total_duration):.2f} seconds
- Speaking time: {float(speaking_time):.2f} seconds
- Speaking rate: {float(speaking_rate):.2f} words/second
- Average volume: {float(average_volume):.2f} dBFS
- Number of pauses: {int(num_pauses)}
"""

        # Use the new OpenAI API format
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a speech and communication coach."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=400
        )

        full_response = response.choices[0].message.content
        
        # Extract the text feedback and JSON scores
        try:
            # Split the response into feedback and scores
            feedback_part = full_response.split("Scores (JSON):")[0].replace("Written Feedback:", "").strip()
            scores_part = full_response.split("Scores (JSON):")[1].strip()
            
            # Parse the JSON scores
            scores_dict = json.loads(scores_part)
            
            return feedback_part, scores_dict
        except Exception as e:
            print(f"Error parsing GPT response: {str(e)}")
            return full_response, {}

    except Exception as e:
        print(f"Error generating GPT feedback: {str(e)}")
        return "Error generating feedback.", {}
