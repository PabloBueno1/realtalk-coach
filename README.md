# RealTalk Coach

A conversational AI coaching application that provides real-time feedback and guidance.

## Prerequisites

- Python 3.8 or higher
- Node.js and npm
- Git

## Setup Instructions

### 1. Clone the Repository
```bash
git clone [your-repository-url]
cd realtalk-coach
```

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - Windows:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   Create a `.env` file in the backend directory with the following required variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   SECRET_KEY=your_jwt_secret_key
   ```

5. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend will run on `http://localhost:8000`

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm start
   ```
   The frontend will run on `http://localhost:3000`

## API Documentation

Once the backend server is running, you can access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Features

- Speech-to-Text using OpenAI Whisper API
- Conversation Engine using OpenAI GPT-4 Turbo
- AI Voice Output using ElevenLabs
- Scoring System using GPT-4
- Visual Feedback using MediaPipe
- User Authentication and Session Management
- Data Storage with Supabase

## Required API Keys

You'll need to obtain the following API keys:
- OpenAI API key
- ElevenLabs API key
- Supabase credentials

## Notes

- The application uses WebSocket for real-time communication
- Make sure your network allows WebSocket connections
- The backend requires several external services for full functionality
- Development mode is enabled by default for both frontend and backend