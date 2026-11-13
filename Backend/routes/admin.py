"""Admin-only endpoints: user management, platform stats and AI usage dashboards."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from core.config import get_settings
from core.security import ROLES, AdminUser, resolve_role
from database.db import db
from utils.response import convert_to_serializable, responses

admin = APIRouter(prefix="/admin", tags=["Admin"])


class RoleChange(BaseModel):
    role: str


@admin.get("/users", responses=responses)
def list_users(user: AdminUser):
    out = []
    for u in db.user.find().sort("email", 1):
        out.append({
            "user_id": u.get("user_id"), "email": u["email"], "name": u.get("name"),
            "role": resolve_role(u["email"], u.get("roles")), "courses": len(u.get("courses") or []),
            "disabled": bool(u.get("disabled")),
        })
    return out


@admin.patch("/users/{email}/role", responses=responses)
def change_role(email: str, body: RoleChange, user: AdminUser):
    role = body.role.lower()
    if role not in ROLES:
        raise HTTPException(status_code=422, detail="role must be student, instructor or admin")
    target = db.user.find_one({"email": email})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if email == user.email and role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role")
    db.user.update_one({"email": email}, {"$set": {"roles": [role]}})
    effective = resolve_role(email, [role])
    return {"email": email, "role": effective,
            "note": None if effective == role else "Role is pinned by an environment variable (ADMIN_EMAILS / INSTRUCTOR_EMAILS)"}


@admin.get("/stats", responses=responses)
def stats(user: AdminUser):
    return {
        "users": db.user.count_documents({}), "courses": db.course.count_documents({}),
        "assignments": db.assignment.count_documents({}) + db.coding_assignment.count_documents({}),
        "submissions": db.submission.count_documents({}), "flashcards": db.flashcard.count_documents({}),
        "ai_requests": db.ai_logs.count_documents({}),
    }


def _bucket() -> dict:
    return {"requests": 0, "tokens_in": 0, "tokens_out": 0, "latency_total": 0, "errors": 0, "cost_usd": 0.0}


def _finish(key: str, label: str, b: dict) -> dict:
    n = b["requests"] or 1
    return {label: key, "requests": b["requests"], "tokens_in": b["tokens_in"], "tokens_out": b["tokens_out"],
            "avg_latency_ms": round(b["latency_total"] / n), "errors": b["errors"],
            "est_cost_usd": round(b["cost_usd"], 4)}


@admin.get("/ai/usage", responses=responses)
def ai_usage(user: AdminUser, days: int = Query(7, ge=1, le=90)):
    since = (datetime.now(timezone.utc) - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    per_day: dict[str, dict] = defaultdict(_bucket)
    per_feature: dict[str, dict] = defaultdict(_bucket)
    total = _bucket()
    for d in range(days):  # include empty days so charts have a continuous axis
        per_day[(since + timedelta(days=d)).date().isoformat()]
    for log in db.ai_logs.find({"created_at": {"$gte": since}}):
        created = log["created_at"]
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        for b in (per_day[created.date().isoformat()], per_feature[log["feature"]], total):
            b["requests"] += 1
            b["tokens_in"] += log.get("tokens_in", 0)
            b["tokens_out"] += log.get("tokens_out", 0)
            b["latency_total"] += log.get("latency_ms", 0)
            b["errors"] += 1 if log.get("status") != "ok" else 0
            b["cost_usd"] += log.get("cost_usd", 0.0)
    return {
        "days": days,
        "daily_cap": get_settings().ai_daily_request_cap,
        "total": _finish("total", "scope", total),
        "per_day": [_finish(k, "date", v) for k, v in sorted(per_day.items())],
        "per_feature": [_finish(k, "feature", v) for k, v in sorted(per_feature.items())],
    }


@admin.get("/ai/logs", responses=responses)
def ai_logs(user: AdminUser, limit: int = Query(50, ge=1, le=200)):
    rows = []
    for d in db.ai_logs.find().sort("created_at", -1).limit(limit):
        d = convert_to_serializable(d)
        d["prompt_preview"] = (d.pop("prompt", "") or "")[:160]
        d.pop("system_prompt", None)
        d.pop("output", None)
        rows.append(d)
    return rows


@admin.post("/demo/reset", responses=responses)
def reset_demo(user: AdminUser):
    if not get_settings().demo_mode:
        raise HTTPException(status_code=403, detail="Demo mode is disabled")
    from scripts.seed_demo import seed

    return {"message": "Demo data re-seeded", **seed()}
