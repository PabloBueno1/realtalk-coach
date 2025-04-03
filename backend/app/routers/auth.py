from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

router = APIRouter(
    prefix="/auth",
    tags=["authentication"]
)

@router.post("/token")
async def login():
    pass

@router.post("/register")
async def register():
    pass

@router.get("/me")
async def get_current_user():
    pass 