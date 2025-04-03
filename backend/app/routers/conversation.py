from fastapi import APIRouter, Depends

router = APIRouter(
    prefix="/conversation",
    tags=["conversation"]
)

@router.post("/start")
async def start_conversation():
    pass

@router.post("/{conversation_id}/message")
async def send_message():
    pass

@router.get("/{conversation_id}")
async def get_conversation():
    pass

@router.get("/user/{user_id}")
async def get_user_conversations():
    pass 