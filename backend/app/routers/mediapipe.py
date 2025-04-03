from fastapi import APIRouter, UploadFile, File

router = APIRouter(
    prefix="/mediapipe",
    tags=["mediapipe"]
)

@router.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    pass

@router.post("/feedback")
async def get_visual_feedback():
    pass 