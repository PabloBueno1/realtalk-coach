from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RealTalk Coach API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
# from app.routers import auth, conversation, speech, scoring, mediapipe

@app.get("/")
async def root():
    return {"message": "Welcome to RealTalk Coach API"}

@app.get("/test")
async def test_endpoint():
    return {"status": "success", "message": "API is working!"} 