from typing import Optional
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class MaterialType(str, Enum):
    video_url = "video_URL"
    file_url = "file_URL"
    pdf = "pdf"
    transcript = "transcript"
    notes = "notes"
    slides = "slides"


def _check_url(url: Optional[str]) -> Optional[str]:
    if url in (None, ""):
        return None
    if not url.startswith(("http://", "https://")) or " " in url or len(url) > 2048:
        raise ValueError("Invalid URL")
    return url


class Course(BaseModel):
    course_id: str = Field(min_length=1, max_length=32, pattern=r"^[A-Za-z0-9_-]+$")
    course_name: str = Field(min_length=1, max_length=200)


class CourseMaterial(BaseModel):
    course_id: str
    material_type: MaterialType
    title: Optional[str] = Field(default=None, max_length=200)
    url: Optional[str] = None
    content: Optional[str] = None
    week: int = Field(ge=0, le=12)

    _v_url = field_validator("url")(_check_url)


class CourseMaterialUpdate(BaseModel):
    material_type: MaterialType
    title: Optional[str] = Field(default=None, max_length=200)
    url: Optional[str] = None
    content: Optional[str] = None
    week: int = Field(ge=0, le=12)

    _v_url = field_validator("url")(_check_url)


class Notes(BaseModel):
    course_id: str
    title: str = Field(min_length=1, max_length=200)
    content: str
    url: Optional[str] = None
    week: Optional[int] = Field(default=None, ge=0, le=12)

    _v_url = field_validator("url")(_check_url)


class NotesUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str
    url: Optional[str] = None
    week: Optional[int] = Field(default=None, ge=0, le=12)

    _v_url = field_validator("url")(_check_url)
