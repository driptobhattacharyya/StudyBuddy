from typing import Optional

from pydantic import BaseModel, Field


class FlashCard(BaseModel):
    user_id: Optional[str] = None
    course_id: str
    week: int = Field(ge=0, le=12)
    title: str = Field(min_length=1, max_length=200)
    content: Optional[str] = None


class FlashCardUpdate(BaseModel):
    week: Optional[int] = Field(default=None, ge=0, le=12)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    content: Optional[str] = None
