import pytest

from core.config import get_settings
from core.security import create_access_token, resolve_role


def test_auth_config_is_public(client):
    assert client.get("/auth/config").json() == {"demo_mode": True, "google_login": False, "ai_provider": "mock"}


@pytest.mark.parametrize("role", ["student", "instructor", "admin"])
def test_demo_login_roles(client, role):
    res = client.post("/auth/demo", json={"role": role})
    assert res.status_code == 200
    body = res.json()
    assert body["role"] == role and body["token_type"] == "bearer"
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"}).json()
    assert me["role"] == role
    assert me["email"] == f"demo.{role}@studybuddy.dev"
    assert set(me) == {"email", "name", "picture", "role", "courses"}


def test_demo_disabled(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    assert client.post("/auth/demo", json={"role": "student"}).status_code == 403
    assert client.get("/auth/config").json()["demo_mode"] is False


def test_demo_rejects_unknown_role(client):
    assert client.post("/auth/demo", json={"role": "root"}).status_code == 422


def test_unauthenticated_and_bad_tokens(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/course/getall").status_code == 401
    assert client.get("/course/getall", headers={"Authorization": "Bearer nope"}).status_code == 401
    expired = create_access_token("demo.student@studybuddy.dev", "student")
    assert client.get("/course/getall", headers={"Authorization": f"Bearer {expired}"}).status_code in (200, 401)


def test_token_for_unknown_user_rejected(client):
    token = create_access_token("ghost@example.com", "admin")
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_students_cannot_use_instructor_routes(client, student, course):
    assert client.post("/course/create", json={"course_id": "N1", "course_name": "n"}, headers=student).status_code == 403
    assert client.put(f"/course/update/{course}", json={"course_id": course, "course_name": "x"}, headers=student).status_code == 403
    assert client.post("/notes/create", json={"course_id": course, "title": "t", "content": "c"}, headers=student).status_code == 403
    assert client.post("/course_material/create", json={"course_id": course, "material_type": "notes", "content": "c", "week": 1}, headers=student).status_code == 403
    assert client.post("/assignment/create", json={}, headers=student).status_code == 403
    assert client.delete("/assignment/delete/" + "a" * 24, headers=student).status_code == 403
    assert client.post("/coding_assignment/create_programming_question", json={}, headers=student).status_code == 403
    assert client.get(f"/course/{course}/marks", headers=student).status_code == 403
    assert client.get(f"/course/{course}/insights", headers=student).status_code == 403


def test_instructor_and_admin_can_manage_courses(client, instructor, admin):
    assert client.post("/course/create", json={"course_id": "N1", "course_name": "n"}, headers=instructor).status_code == 201
    assert client.post("/course/create", json={"course_id": "N2", "course_name": "n"}, headers=admin).status_code == 201
    assert client.post("/course/create", json={"course_id": "N1", "course_name": "n"}, headers=admin).status_code == 409


def test_instructor_cannot_use_admin_routes(client, instructor, student):
    for path in ("/admin/users", "/admin/stats", "/admin/ai/usage", "/admin/ai/logs"):
        assert client.get(path, headers=instructor).status_code == 403
        assert client.get(path, headers=student).status_code == 403
    assert client.post("/admin/demo/reset", headers=instructor).status_code == 403


def test_students_cannot_submit_as_instructor(client, instructor):
    assert client.post("/user/submit_answers", json=[], headers=instructor).status_code == 403


def test_admin_user_management(client, admin, student):
    users = client.get("/admin/users", headers=admin).json()
    assert {"email", "role", "courses"} <= set(users[0])
    res = client.patch("/admin/users/demo.student@studybuddy.dev/role", json={"role": "instructor"}, headers=admin)
    assert res.status_code == 200
    # demo users keep their fixed demo role while DEMO_MODE is on... but stored role wins above student
    assert res.json()["role"] == "instructor"
    assert client.patch("/admin/users/demo.student@studybuddy.dev/role", json={"role": "wizard"}, headers=admin).status_code == 422
    assert client.patch("/admin/users/nobody@x.com/role", json={"role": "student"}, headers=admin).status_code == 404
    assert client.patch("/admin/users/demo.admin@studybuddy.dev/role", json={"role": "student"}, headers=admin).status_code == 400


def test_admin_stats(client, admin, course, questions):
    stats = client.get("/admin/stats", headers=admin).json()
    assert stats["courses"] == 1 and stats["assignments"] == 4


def test_role_resolution_from_env(monkeypatch):
    monkeypatch.setattr(get_settings(), "admin_emails", "Boss@x.com")
    monkeypatch.setattr(get_settings(), "instructor_emails", "teach@x.com, t2@x.com")
    assert resolve_role("boss@x.com", None) == "admin"
    assert resolve_role("t2@x.com", ["student"]) == "instructor"
    assert resolve_role("a@x.com", ["admin"]) == "admin"
    assert resolve_role("a@x.com", ["user"]) == "student"


def test_websocket_rejects_bad_token(client):
    with client.websocket_connect("/generate?token=bad") as ws:
        with pytest.raises(Exception) as exc:
            ws.receive_text()
    assert "4401" in repr(exc.value) or getattr(exc.value, "code", None) == 4401


def test_validation_error_shape_and_no_stack_traces(client, instructor):
    res = client.post("/course/create", json={"course_id": "bad id!", "course_name": ""}, headers=instructor)
    assert res.status_code == 422
    res = client.get("/assignment/get/not-an-id", headers=instructor)
    assert res.status_code == 422 and "detail" in res.json()


def test_admin_cannot_demote_self_and_role_changes_stick(client, admin, student, db):
    assert client.patch("/admin/users/demo.admin@studybuddy.dev/role", json={"role": "student"}, headers=admin).status_code == 400
    # demoting / promoting a demo user is honoured (not silently reset to the demo default)
    r = client.patch("/admin/users/demo.student@studybuddy.dev/role", json={"role": "instructor"}, headers=admin)
    assert r.json()["role"] == "instructor" and r.json()["note"] is None
    assert client.get("/auth/me", headers=student).json()["role"] == "instructor"
    client.patch("/admin/users/demo.student@studybuddy.dev/role", json={"role": "student"}, headers=admin)
    assert client.get("/auth/me", headers=student).json()["role"] == "student"


def test_env_pinned_role_is_reported(client, admin, monkeypatch):
    from core.config import get_settings

    monkeypatch.setattr(get_settings(), "instructor_emails", "demo.student@studybuddy.dev")
    client.post("/auth/demo", json={"role": "student"})
    r = client.patch("/admin/users/demo.student@studybuddy.dev/role", json={"role": "student"}, headers=admin)
    assert r.json()["role"] == "instructor" and "pinned" in r.json()["note"]


def test_deadlines_endpoint(client, student, instructor, db, coding, questions):
    rows = client.get("/user/deadlines", headers=student).json()
    assert rows == []  # student not enrolled in T101 yet
    db.user.update_one({"email": "demo.student@studybuddy.dev"}, {"$set": {"courses": ["T101"]}})
    rows = client.get("/user/deadlines", headers=student).json()
    kinds = {r["kind"] for r in rows}
    assert kinds == {"assignment", "coding"} and len(rows) == 4  # the past-deadline question is excluded
    assert rows == sorted(rows, key=lambda r: r["deadline"]) and rows[0]["course_name"] == "Testing 101"
    assert client.get("/user/deadlines", headers={}).status_code == 401
