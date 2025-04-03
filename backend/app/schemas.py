from pydantic import BaseModel

# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

