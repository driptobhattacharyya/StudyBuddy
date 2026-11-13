"""WebSocket streaming endpoints. Auth: ``?token=<jwt>``; invalid -> close code 4401."""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

from ai import service as ai_service
from ai.errors import AIError, to_http
from core.deps import check_daily_cap
from core.ratelimit import ai_limiter
from core.security import user_from_token

log = logging.getLogger(__name__)
ws_router = APIRouter()

END = "[[END]]"


async def _authenticate(websocket: WebSocket):
    await websocket.accept()
    token = websocket.query_params.get("token")
    try:
        if not token:
            raise HTTPException(status_code=401)
        return await run_in_threadpool(user_from_token, token)
    except HTTPException:
        await websocket.close(code=4401, reason="Unauthorized")
        return None


async def _serve(websocket: WebSocket, build):
    """Shared loop: auth, parse one JSON request, stream chunks, send META, END, close."""
    user = await _authenticate(websocket)
    if user is None:
        return
    try:
        request = await websocket.receive_json()
        if not isinstance(request, dict):
            raise ValueError
    except WebSocketDisconnect:
        return
    except Exception:  # noqa: BLE001
        await websocket.send_text("[[ERROR]] Invalid request")
        await websocket.close(code=1003)
        return
    try:
        ai_limiter.check(user.email)
        await run_in_threadpool(check_daily_cap)
        session = await build(user, request)
        async for chunk in session.chunks():
            await websocket.send_text(chunk)
        await websocket.send_text("[[META]] " + json.dumps(session.trace.meta()))
        await websocket.send_text(END)
    except WebSocketDisconnect:
        return
    except HTTPException as exc:
        await websocket.send_text(f"[[ERROR]] {exc.detail}")
    except AIError as exc:
        await websocket.send_text(f"[[ERROR]] {to_http(exc).detail}")
    except Exception:  # noqa: BLE001
        log.exception("Unhandled error in websocket stream")
        await websocket.send_text("[[ERROR]] Something went wrong")
    try:
        await websocket.close()
    except RuntimeError:
        pass


@ws_router.websocket("/generate")
async def generate_ws(websocket: WebSocket):
    async def build(user, req):
        query = req.get("query")
        if not isinstance(query, str):
            raise HTTPException(status_code=422, detail="query is required")
        return ai_service.begin_chat_stream(user.email, query)

    await _serve(websocket, build)


@ws_router.websocket("/search_generate")
async def search_generate_ws(websocket: WebSocket):
    async def build(user, req):
        query, course_id, week = req.get("query"), req.get("course_id"), req.get("week")
        if not isinstance(query, str) or not isinstance(course_id, str) or not isinstance(week, int):
            raise HTTPException(status_code=422, detail="query, course_id and week are required")
        from utils.lookup import ensure_course

        await run_in_threadpool(ensure_course, course_id)
        return await ai_service.begin_course_stream(user.email, course_id, week, query)

    await _serve(websocket, build)
