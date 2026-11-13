from typing import Optional

from pydantic import BaseModel, Field


class AIQuery(BaseModel):
    query: str = Field(min_length=1)


class GenerateResponse(BaseModel):
    query: str = Field(min_length=1)
    course_id: str
    week: int = Field(ge=0, le=12)


class TextBody(BaseModel):
    text: str = Field(min_length=1)


class HintRequest(BaseModel):
    assgn_id: str
    code: Optional[str] = None
    message: Optional[str] = None


class GenerateFromMaterial(BaseModel):
    material_id: Optional[str] = None
    text: Optional[str] = None
    n_questions: int = Field(default=4, ge=1, le=10)


class SuccessCreateResponse(BaseModel):
    message: str
    db_entry_id: str = Field(min_length=24, max_length=24)


class SuccessDeleteResponse(BaseModel):
    message: str


class DemoLoginRequest(BaseModel):
    role: str = "student"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
