from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.routers.auth import router as auth_router
from app.routers.speech import router as speech_router
from app.routers.visual import router as visual_router
from app.routers.chat import router as chat_router
from app.routers.scenarios import router as scenarios_router
from app.routers.scores import router as scores_router

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend URL
        "https://fidupia.vercel.app",
        "https://fidupia-pablobueno1s-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(speech_router, prefix="/speech", tags=["speech"])
app.include_router(visual_router, prefix="/visual", tags=["visual"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(scenarios_router, prefix="/scenarios", tags=["scenarios"])
app.include_router(scores_router, prefix="/scores", tags=["scores"])

@app.get("/")
async def root():
    return {"message": "Welcome to RealTalk Coach API"}
