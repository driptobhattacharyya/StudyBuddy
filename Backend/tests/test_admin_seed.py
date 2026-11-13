from datetime import datetime, timedelta, timezone

import pytest

from scripts.seed_content import CODING, REFERENCE_SOLUTIONS
from scripts.seed_demo import seed
from runner.grading import evaluate_tests, score


def test_admin_ai_usage_and_logs(client, admin, student, fake_ai, db):
    fake_ai.replies = ['{"summary": "s"}']
    client.post("/summarize", json={"text": "abc"}, headers=student)
    client.post("/summarize", json={"text": "abc"}, headers=student)
    db.ai_logs.insert_one({"user": "x", "feature": "chat", "provider": "p", "model": "m", "prompt": "q" * 500,
                           "system_prompt": "s", "tokens_in": 10, "tokens_out": 20, "latency_ms": 100,
                           "status": "error", "error": "boom", "cost_usd": 0.01,
                           "created_at": datetime.now(timezone.utc) - timedelta(days=2)})
    usage = client.get("/admin/ai/usage?days=7", headers=admin).json()
    assert usage["total"]["requests"] == 3 and usage["total"]["errors"] == 1
    assert len(usage["per_day"]) == 7
    feats = {f["feature"]: f for f in usage["per_feature"]}
    assert feats["summarize"]["requests"] == 2 and feats["chat"]["avg_latency_ms"] == 100
    logs = client.get("/admin/ai/logs?limit=2", headers=admin).json()
    assert len(logs) == 2 and "prompt" not in logs[0] and len(logs[-1]["prompt_preview"]) <= 160


def test_seed_is_idempotent_and_complete(client, db):
    first = seed()
    counts = {c: db[c].count_documents({}) for c in ("course", "course_material", "assignment", "coding_assignment", "user", "marks", "flashcard", "rag_chunks")}
    second = seed()
    assert counts == {c: db[c].count_documents({}) for c in counts}
    assert first["courses"] == 3 and counts["user"] == 6 and counts["coding_assignment"] == 5
    assert db.user.find_one({"email": "demo.admin@studybuddy.dev"})["roles"] == ["admin"]
    assert counts["rag_chunks"] >= 12 and second["indexed_chunks"] == 0
    # demo logins work against the seeded data and see enrolled courses
    token = client.post("/auth/demo", json={"role": "student"}).json()["access_token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["courses"] == ["PY101", "DS201", "ML301"]
    assert db.marks.count_documents({}) > 10


def test_admin_demo_reset(client, admin, instructor):
    assert client.post("/admin/demo/reset", headers=instructor).status_code == 403
    res = client.post("/admin/demo/reset", headers=admin)
    assert res.status_code == 200 and res.json()["courses"] == 3


@pytest.mark.parametrize("task", CODING, ids=[c["key"] for c in CODING])
def test_seed_reference_solutions_pass_all_tests(task):
    language, code = REFERENCE_SOLUTIONS[task["key"]]
    assert language == task["language"]
    tests = [{"input": i, "output": o} for i, o in task["public"] + task["private"]]
    results = evaluate_tests(language, code, tests)
    assert score(results) == 1.0, results
