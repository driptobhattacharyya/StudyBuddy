"""Video lectures: one YouTube video per lecture, grouped by week and ordered within the week."""
import re
from urllib.parse import parse_qs, urlsplit
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from models.course import _check_url

_YT_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
_YT_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"}
_YT_PATH_PREFIXES = ("embed", "shorts", "live", "v")


def extract_youtube_id(value: str) -> str:
    """Video id from a YouTube link (watch, youtu.be, embed, shorts, live) or a bare id; anything else is rejected."""
    value = (value or "").strip()
    if _YT_ID.match(value):
        return value
    try:
        url = urlsplit(value)
        host = (url.hostname or "").lower()
    except ValueError:
        raise ValueError("Not a YouTube link or video id") from None
    candidate = None
    if url.scheme in ("http", "https") and not url.username and not url.password:
        parts = [p for p in url.path.split("/") if p]
        if host == "youtu.be" and len(parts) == 1:
            candidate = parts[0]
        elif host in _YT_HOSTS:
            if parts == ["watch"]:
                candidate = (parse_qs(url.query).get("v") or [None])[0]
            elif len(parts) == 2 and parts[0] in _YT_PATH_PREFIXES:
                candidate = parts[1]
    if candidate and _YT_ID.match(candidate):
        return candidate
    raise ValueError("Not a YouTube link or video id")


def canonical_youtube_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


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
        return canonical_youtube_url(extract_youtube_id(value))


class Lecture(LectureUpdate):
    course_id: str
