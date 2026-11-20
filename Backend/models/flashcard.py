from typing import Optional

from pydantic import BaseModel, Field


class FlashCard(BaseModel):
    user_id: Optional[str] = None
    course_id: str
    week: int = Field(ge=0, le=12)
    title: str = Field(min_length=1, max_length=200)
    content: Optional[str] = None
    shared: bool = Field(False, description="Instructors only: publish the card to every student of the course")


class FlashCardUpdate(BaseModel):
    week: Optional[int] = Field(default=None, ge=0, le=12)
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    content: Optional[str] = None


class DeckRequest(BaseModel):
    course_id: str
    topic: str = Field(min_length=2, max_length=120)
    count: int = Field(6, ge=3, le=12)
    week: Optional[int] = Field(default=None, ge=0, le=12, description="Only use material up to this week")


class DeckCardIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=4000)
    week: int = Field(ge=0, le=12)


class CreateMany(BaseModel):
    course_id: str
    cards: list[DeckCardIn] = Field(min_length=1, max_length=20)
    shared: bool = Field(False, description="Instructors only: publish the cards to every student of the course")
