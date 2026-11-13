from datetime import datetime, timedelta, timezone

from tests.conftest import b64


def test_student_never_sees_answers(client, student, instructor, course, questions):
    qid = questions["mcq"]
    s = client.get(f"/assignment/get/{qid}", headers=student).json()
    assert "answers" not in s and s["options"] == ["3", "4", "5"]
    i = client.get(f"/assignment/get/{qid}", headers=instructor).json()
    assert i["answers"] == ["4"]

    listing = client.get(f"/course/get_assignment?course_id={course}&week=1&assgn_type=GA", headers=student).json()
    assert listing and all("answers" not in q for q in listing)
    contents = client.get(f"/course/get_contents?course_id={course}", headers=student).json()[0]
    assert all("answers" not in a for a in contents["assignments"])
    week = client.get(f"/course/get_week_content?course_id={course}&week=1", headers=student).json()[0]
    assert all("answers" not in a for a in week["assignments"])
    assert "answers" in client.get(f"/course/get_contents?course_id={course}", headers=instructor).json()[0]["assignments"][0]


def test_student_never_sees_private_tests(client, student, instructor, course, coding):
    s = client.get(f"/coding_assignment/get/{coding}", headers=student).json()
    assert "private_testcase" not in s and s["public_testcase"] and s["private_testcase_count"] == 2
    assert len(client.get(f"/coding_assignment/get/{coding}", headers=instructor).json()["private_testcase"]) == 2
    for path in (f"/course/get_all_assignment?course_id={course}&week=1&assgn_type=GrPA",
                 f"/course/get_assignment?course_id={course}&week=1&assgn_type=GrPA"):
        rows = client.get(path, headers=student).json()
        assert rows and all("private_testcase" not in r for r in rows)
    contents = client.get(f"/course/get_contents?course_id={course}", headers=student).json()[0]
    assert all("private_testcase" not in c for c in contents["coding_assignments"])


def test_instructor_creates_assignment_validations(client, instructor, course):
    payload = {"question": "Q", "q_type": "Numerical", "options": [], "answers": [3], "assgn_type": "GA",
               "course_id": course, "week": 2, "deadline": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()}
    assert client.post("/assignment/create", json=payload, headers=instructor).status_code == 201
    bad = {**payload, "q_type": "MCQ", "options": ["a", "b"], "answers": ["c"]}
    assert client.post("/assignment/create", json=bad, headers=instructor).status_code == 422
    assert client.post("/assignment/create", json={**payload, "course_id": "NOPE"}, headers=instructor).status_code == 404
    naive = {**payload, "deadline": "2030-01-01T00:00:00"}
    assert client.post("/assignment/create", json=naive, headers=instructor).status_code == 201


def test_instructor_creates_coding_assignment(client, instructor, course):
    payload = {"question": "Q", "language": "javascript", "public_testcase": [{"input": "1", "output": "1"}],
               "private_testcase": [{"input": "2", "output": "2"}], "assgn_type": "PPA", "course_id": course,
               "week": 1, "deadline": "2030-01-01T00:00:00Z"}
    res = client.post("/coding_assignment/create_programming_question", json=payload, headers=instructor)
    assert res.status_code == 201
    got = client.get(f"/coding_assignment/get/{res.json()['db_entry_id']}", headers=instructor).json()
    assert got["language"] == "js"


def test_flashcards_are_private(client, db, course):
    a = client.post("/auth/demo", json={"role": "student"}).json()["access_token"]
    # second student: a regular user created directly
    from core.security import create_access_token, create_user

    create_user("other@example.com", "Other")
    ha, hb = {"Authorization": f"Bearer {a}"}, {"Authorization": f"Bearer {create_access_token('other@example.com', 'student')}"}
    res = client.post("/flash_card/create", json={"course_id": course, "week": 1, "title": "T", "content": "C"}, headers=ha)
    card = res.json()["db_entry_id"]
    assert client.get(f"/flash_card/get/{card}", headers=ha).status_code == 200
    assert client.get(f"/flash_card/get/{card}", headers=hb).status_code == 404
    assert client.put(f"/flash_card/update/{card}", json={"title": "x"}, headers=hb).status_code == 404
    assert client.delete(f"/flash_card/delete/{card}", headers=hb).status_code == 404
    assert client.get("/user/flashcards", headers=hb).json() == []
    assert client.put(f"/flash_card/update/{card}", json={"title": "New"}, headers=ha).status_code == 202
    assert client.get(f"/flash_card/get/{card}", headers=ha).json()["title"] == "New"
    assert client.delete(f"/flash_card/delete/{card}", headers=ha).status_code == 200
    assert client.get(f"/flash_card/get/{card}", headers=ha).status_code == 404


def test_get_marks_only_returns_own(client, db, student, instructor, course, questions):
    me = client.get("/user/me", headers=student).json()["user_id"]
    db.marks.insert_many([
        {"user_id": me, "course_id": course, "week": 1, "assgn_type": "GA", "mark": 80.0},
        {"user_id": "someone-else", "course_id": course, "week": 1, "assgn_type": "GA", "mark": 10.0},
    ])
    rows = client.get(f"/user/get_marks?course_id={course}", headers=student).json()
    assert [r["mark"] for r in rows] == [80.0]
    book = client.get(f"/course/{course}/marks", headers=instructor).json()
    assert len(book) == 2


def test_notes_and_material_crud_and_indexing(client, db, instructor, student, course):
    res = client.post("/course_material/create", headers=instructor,
                      json={"course_id": course, "material_type": "notes", "title": "Photosynthesis", "content": "Plants convert light energy into chemical energy.", "week": 1})
    assert res.status_code == 201
    mid = res.json()["db_entry_id"]
    assert db.rag_chunks.count_documents({"source_id": mid}) == 1  # indexed by the background task
    assert len(client.get(f"/course_material/get/{course}", headers=student).json()) == 1
    assert client.put(f"/course_material/update/{mid}", headers=instructor,
                      json={"material_type": "notes", "content": "Updated", "week": 1}).status_code == 202
    assert client.delete(f"/course_material/delete/{mid}", headers=instructor).status_code == 200
    assert db.rag_chunks.count_documents({"source_id": mid}) == 0
    n = client.post("/notes/create", headers=instructor, json={"course_id": course, "title": "N", "content": "body"})
    assert n.status_code == 201 and client.get(f"/notes/get/{course}", headers=student).json()[0]["title"] == "N"
