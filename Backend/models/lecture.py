"""Video lectures: one YouTube video per lecture, grouped by week and ordered within the week."""
import re
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from models.course import _check_url

_YT_ID = r"[A-Za-z0-9_-]{11}"
_YT_PATTERNS = [
    re.compile(rf"youtube(?:-nocookie)?\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/|v/)({_YT_ID})"),
    re.compile(rf"youtu\.be/({_YT_ID})"),
    re.compile(rf"^({_YT_ID})$"),
]


def extract_youtube_id(value: str) -> str:
    """Video id from any common YouTube link shape (watch, youtu.be, embed, shorts, live) or a bare id."""
    value = (value or "").strip()
    for pattern in _YT_PATTERNS:
        match = pattern.search(value)
        if match:
            return match.group(1)
    raise ValueError("Not a YouTube link or video id")


class LectureResource(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    url: str

    _v_url = field_validator("url")(_check_url)


class LectureUpdate(BaseModel):
    week: int = Field(ge=1, le=12)
    order: int = Field(default=1, ge=1, le=50, description="Position within the week")
    title: str = Field(min_length=1, max_length=200)
    youtube_url: str = Field(max_length=500, description="Any YouTube link or a bare 11-character video id")
    description: Optional[str] = Field(default=None, max_length=2000)
    notes: Optional[str] = Field(default=None, max_length=20000, description="Markdown shown under the video")
    duration: Optional[str] = Field(default=None, max_length=40)
    source: Optional[str] = Field(default=None, max_length=120, description="Who made the video")
    resources: List[LectureResource] = Field(default_factory=list, max_length=20)

    @field_validator("youtube_url")
    @classmethod
    def _valid_youtube(cls, value: str) -> str:
        extract_youtube_id(value)
        return value.strip()


class Lecture(LectureUpdate):
    course_id: str
