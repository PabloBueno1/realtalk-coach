from fastapi import APIRouter, UploadFile, File

router = APIRouter(
    prefix="/speech",
    tags=["speech"]
)

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    pass

@router.post("/synthesize")
async def synthesize_speech():
    pass 