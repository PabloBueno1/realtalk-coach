from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.auth import router as auth_router
from app.routers.speech import router as speech_router
from app.routers.visual import router as visual_router
from app.routers.chat import router as chat_router

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(speech_router, prefix="/speech", tags=["speech"])
app.include_router(visual_router, prefix="/visual", tags=["visual"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])

@app.get("/")
async def root():
    return {"message": "Welcome to RealTalk Coach API"}
