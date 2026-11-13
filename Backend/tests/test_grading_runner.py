import math
from datetime import datetime, timedelta, timezone

import pytest

from core.config import get_settings
from runner import run_code
from runner.grading import evaluate_tests, normalize_output, score
from utils.grading import decode_code, deadline_passed, is_correct
from tests.conftest import b64


# ------------------------------------------------------------------ pure grading
def test_is_correct_variants():
    mcq = {"q_type": "MCQ", "answers": ["4"]}
    assert is_correct(mcq, ["4"]) and not is_correct(mcq, ["3"]) and not is_correct(mcq, ["4", "3"])
    msq = {"q_type": "MSQ", "answers": ["2", "3"]}
    assert is_correct(msq, [["3", "2"]]) and not is_correct(msq, ["2"]) and not is_correct(msq, ["2", "3", "4"])
    num = {"q_type": "Numeric", "answers": [0.75]}
    assert is_correct(num, ["0.75"]) and is_correct(num, [" 0.7500 "]) and not is_correct(num, ["abc"])
    assert not is_correct(mcq, []) and not is_correct({"q_type": "MCQ", "answers": []}, ["x"])


def test_decode_code_and_deadline():
    assert decode_code([b64("print(1)")]) == "print(1)"
    assert decode_code(["print(1)"]) == "print(1)"
    now = datetime.now(timezone.utc)
    assert deadline_passed({"deadline": now - timedelta(seconds=1)})
    assert not deadline_passed({"deadline": now + timedelta(hours=1)})
    assert deadline_passed({"deadline": datetime.utcnow() - timedelta(hours=1)})  # naive datetimes are treated as UTC
    assert not deadline_passed({})


def test_output_normalisation_and_empty_score():
    assert normalize_output("a  \r\nb\n\n") == "a\nb"
    assert score([]) == 0.0 and math.isclose(score([{"passed": True}, {"passed": False}]), 0.5)


# ----------------------------------------------------------------- grading via API
def test_submit_answers_grades_immediately(client, student, questions, course):
    payload = [
        {"assgn_id": questions["mcq"], "answer": ["4"]},
        {"assgn_id": questions["msq"], "answer": [["2", "3"]]},
        {"assgn_id": questions["num"], "answer": ["5"]},
    ]
    res = client.post("/user/submit_answers", json=payload, headers=student)
    assert res.status_code == 200, res.text
    marks = {r["assgn_id"]: r["mark"] for r in res.json()["results"]}
    assert marks == {questions["mcq"]: 1.0, questions["msq"]: 1.0, questions["num"]: 0.0}
    weekly = client.get(f"/user/get_marks?course_id={course}", headers=student).json()
    # 4 GA questions in week 1 (one is the late one, unanswered -> 0): 2/4 = 50%
    assert weekly[0]["mark"] == 50.0 and weekly[0]["week"] == 1
    # resubmitting replaces, not duplicates
    client.post("/user/submit_answers", json=[{"assgn_id": questions["num"], "answer": ["4"]}], headers=student)
    assert client.get(f"/user/get_marks?course_id={course}", headers=student).json()[0]["mark"] == 75.0


def test_msq_requires_exact_set(client, student, questions):
    res = client.post("/user/submit_answers", json=[{"assgn_id": questions["msq"], "answer": ["2"]}], headers=student)
    assert res.json()["results"][0]["mark"] == 0.0


def test_submission_after_deadline_rejected(client, student, questions):
    res = client.post("/user/submit_answers", json=[{"assgn_id": questions["late"], "answer": ["a"]}], headers=student)
    assert res.status_code == 400


def test_submit_unknown_assignment(client, student):
    assert client.post("/user/submit_answers", json=[{"assgn_id": "a" * 24, "answer": ["x"]}], headers=student).status_code == 404
    assert client.post("/user/submit_answers", json=[], headers=student).status_code == 422


def test_gradebook_and_insights(client, student, instructor, questions, course):
    client.post("/user/submit_answers", json=[{"assgn_id": questions["mcq"], "answer": ["3"]}], headers=student)
    me = client.get(f"/user/insights/{course}", headers=student).json()
    assert me["weak_topics"] and me["weak_topics"][0]["week"] == 1
    cls = client.get(f"/course/{course}/insights", headers=instructor).json()
    assert cls["week_averages"][0]["week"] == 1
    assert client.get(f"/course/{course}/marks", headers=instructor).json()[0]["mark"] == 0.0


# ------------------------------------------------------------------------ runner
def test_python_pass_and_fail():
    ok = run_code("python", "print(int(input()) * 2)", "21")
    assert ok.status == "ok" and ok.stdout.strip() == "42"
    bad = run_code("python", "raise SystemExit(3)")
    assert bad.status == "runtime_error" and bad.exit_code == 3
    err = run_code("python", "print(1/0)")
    assert err.status == "runtime_error" and "ZeroDivisionError" in err.stderr


def test_python_syntax_error():
    r = run_code("python", "def (:")
    assert r.status == "runtime_error" and "SyntaxError" in r.stderr


def test_timeout_kills_infinite_loop():
    get_settings().code_timeout_seconds = 1
    r = run_code("python", "while True: pass")
    assert r.status == "timeout" and r.time_ms < 4000


def test_huge_output_is_capped():
    get_settings().code_max_output_bytes = 2000
    r = run_code("python", "while True: print('x' * 1000)")
    assert r.status == "output_limit" and r.truncated and len(r.stdout) <= 2000


def test_environment_is_stripped(monkeypatch):
    monkeypatch.setenv("SUPER_SECRET", "hunter2")
    r = run_code("python", "import os; print(os.environ.get('SUPER_SECRET'), os.environ.get('SECRET_KEY'))")
    assert r.stdout.strip() == "None None"


def test_memory_limit():
    get_settings().code_memory_mb = 128
    r = run_code("python", "x = bytearray(1024 * 1024 * 1024)")
    assert r.status == "runtime_error" and "MemoryError" in r.stderr


def test_javascript():
    assert run_code("javascript", "console.log(require('fs').readFileSync(0,'utf8').trim().toUpperCase())", "hi").stdout.strip() == "HI"
    assert run_code("js", "throw new Error('boom')").status == "runtime_error"
    get_settings().code_timeout_seconds = 1
    assert run_code("javascript", "while(true){}").status == "timeout"


def test_java_pass_compile_error_and_class_name():
    src = "public class Main { public static void main(String[] a){ System.out.println(new java.util.Scanner(System.in).nextInt() + 1); } }"
    r = run_code("java", src, "41")
    assert r.status == "ok" and r.stdout.strip() == "42"
    ce = run_code("java", "public class Main { oops }")
    assert ce.status == "compile_error" and "error" in ce.stderr
    other = run_code("java", "public class Hello { public static void main(String[] a){ System.out.println(7); } }")
    assert other.stdout.strip() == "7"


def test_unsupported_language():
    from runner import UnsupportedLanguage

    with pytest.raises(UnsupportedLanguage):
        run_code("cobol", "x")


def test_evaluate_tests_compares_ignoring_trailing_space():
    res = evaluate_tests("python", "print(input() + '  ')", [{"input": "a", "output": "a"}, {"input": "b", "output": "c"}])
    assert [r["passed"] for r in res] == [True, False]
    assert {"input", "expected", "output", "passed", "time_ms"} <= set(res[0])


def test_judge0_backend_with_mock_transport():
    import base64
    import httpx

    from runner.judge0 import Judge0Runner

    def handler(request: httpx.Request) -> httpx.Response:
        body = request.read()
        assert b"source_code" in body
        out = base64.b64encode(b"42\n").decode()
        return httpx.Response(200, json={"status": {"id": 3}, "stdout": out, "time": "0.01"})

    runner = Judge0Runner(client=httpx.Client(transport=httpx.MockTransport(handler), base_url="http://j0"))
    r = runner.run_suite("python", "print(42)", ["", ""])
    assert [x.status for x in r] == ["ok", "ok"] and r[0].stdout.strip() == "42"

    def tle(request):
        return httpx.Response(200, json={"status": {"id": 5}, "time": "5"})

    assert Judge0Runner(client=httpx.Client(transport=httpx.MockTransport(tle), base_url="http://j0")).run_suite("java", "x", [""])[0].status == "timeout"


# --------------------------------------------------------------- run endpoint
def test_run_endpoint_hides_private_details_for_students(client, student, instructor, coding, db):
    code = b64("print(int(input()) * 2)")
    res = client.post("/coding_assignment/run", json={"assgn_id": coding, "code": code}, headers=student)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["mark"] == 100 and body["passed_public_count"] == "1/1" and body["passed_private_count"] == "2/2"
    assert set(body["private_testcases"][0]) == {"passed", "status", "run_status", "time_ms"}
    assert body["public_testcases"][0]["expected"] == "4"
    assert body["saved"] is True and db.submission.count_documents({}) == 1
    assert db.marks.find_one({})["mark"] == 100.0
    full = client.post("/coding_assignment/run", json={"assgn_id": coding, "code": code}, headers=instructor).json()
    assert full["private_testcases"][0]["expected"] == "10" and "saved" not in full


def test_run_endpoint_partial_marks_and_errors(client, student, coding):
    res = client.post("/coding_assignment/run", json={"assgn_id": coding, "code": b64("print(10)")}, headers=student).json()
    assert res["mark"] == 50
    assert client.post("/coding_assignment/run", json={"assgn_id": coding, "code": "%%%"}, headers=student).status_code == 400
    assert client.post("/coding_assignment/run", json={"assgn_id": "b" * 24, "code": b64("x")}, headers=student).status_code == 404
    ce = client.post("/coding_assignment/run", json={"assgn_id": coding, "code": b64("def (:")}, headers=student).json()
    assert ce["mark"] == 0 and ce["public_testcases"][0]["error"]


def test_run_is_rate_limited(client, student, coding):
    get_settings().rate_limit_run_per_minute = 1
    body = {"assgn_id": coding, "code": b64("print(1)")}
    assert client.post("/coding_assignment/run", json=body, headers=student).status_code == 200
    assert client.post("/coding_assignment/run", json=body, headers=student).status_code == 429
