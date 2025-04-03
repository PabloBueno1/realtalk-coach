# RealTalk Coach Backend

This is the backend service for the RealTalk Coach application, built with FastAPI.

## Features

- Speech-to-Text using OpenAI Whisper API
- Conversation Engine using OpenAI GPT-4 Turbo
- AI Voice Output using ElevenLabs
- Scoring System using GPT-4
- Visual Feedback using MediaPipe
- User Authentication and Session Management
- Data Storage with Supabase

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory with the following variables:
```
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SECRET_KEY=your_jwt_secret_key
```

4. Run the development server:
```bash
uvicorn main:app --reload
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc 