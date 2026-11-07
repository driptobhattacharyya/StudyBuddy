from datetime import datetime, timezone
from enum import Enum
from typing import Any

from bson import ObjectId

responses = {
    404: {"description": "Not found", "content": {"application/json": {"example": {"detail": "Not found"}}}},
    500: {"description": "Internal server error"},
    422: {"description": "Validation error"},
}


def convert_to_serializable(item: Any) -> Any:
    """Recursively turn Mongo documents into JSON friendly values."""
    if isinstance(item, dict):
        return {key: convert_to_serializable(value) for key, value in item.items()}
    if isinstance(item, (list, tuple)):
        return [convert_to_serializable(element) for element in item]
    if isinstance(item, ObjectId):
        return str(item)
    if isinstance(item, datetime):
        return as_utc(item).isoformat()
    return item


def as_utc(dt: datetime) -> datetime:
    """Return an aware UTC datetime (naive values are assumed to be UTC)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def objectEntity(item: dict) -> dict:
    return convert_to_serializable(item)


def objectsEntity(entity) -> list:
    return [convert_to_serializable(item) for item in entity]


def parse_object_id(value: str, label: str = "id") -> ObjectId:
    from fastapi import HTTPException

    try:
        return ObjectId(value)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"Invalid {label}") from None


def to_doc(model) -> dict:
    """Dump a pydantic model to a Mongo-ready dict (enums become plain values)."""

    def conv(v):
        if isinstance(v, Enum):
            return v.value
        if isinstance(v, dict):
            return {k: conv(x) for k, x in v.items()}
        if isinstance(v, list):
            return [conv(x) for x in v]
        return v

    return conv(model.model_dump(mode="python"))
