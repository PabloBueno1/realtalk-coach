from fastapi import APIRouter

router = APIRouter(
    prefix="/scoring",
    tags=["scoring"]
)

@router.post("/evaluate")
async def evaluate_conversation():
    pass

@router.get("/{conversation_id}/feedback")
async def get_conversation_feedback():
    pass 