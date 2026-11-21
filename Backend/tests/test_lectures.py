from datetime import datetime, timezone

import pytest

from models.lecture import extract_youtube_id
from scripts import seed_extra_courses
from scripts.seed_content import LECTURES
from scripts.seed_demo import seed
from utils.grading import is_correct


@pytest.mark.parametrize("link", [
    "https://www.youtube.com/watch?v=fNk_zzaMoSs",
    "https://youtu.be/fNk_zzaMoSs?t=30",
    "https://www.youtube.com/watch?list=PL123&v=fNk_zzaMoSs",
    "https://www.youtube.com/embed/fNk_zzaMoSs",
    "https://www.youtube-nocookie.com/embed/fNk_zzaMoSs",
    "https://www.youtube.com/shorts/fNk_zzaMoSs",
    "fNk_zzaMoSs",
])
def test_youtube_id_from_any_link(link):
    assert extract_youtube_id(link) == "fNk_zzaMoSs"


def _body(**kw):
    return {"course_id": "T101", "week": 1, "order": 1, "title": "Intro", "youtube_url": "https://youtu.be/fNk_zzaMoSs", **kw}


def test_lecture_crud_and_permissions(client, course, student, instructor):
    assert client.post("/lecture/create", json=_body(), headers=student).status_code == 403
    assert client.post("/lecture/create", json=_body(youtube_url="https://vimeo.com/1"), headers=instructor).status_code == 422
    assert client.post("/lecture/create", json=_body(course_id="NOPE"), headers=instructor).status_code == 404
    assert client.post("/lecture/create", json=_body(resources=[{"label": "x", "url": "javascript:alert(1)"}]),
                       headers=instructor).status_code == 422

    second = client.post("/lecture/create", json=_body(week=2, title="Later", youtube_url="k7RM-ot2NWY"), headers=instructor)
    first = client.post("/lecture/create", json=_body(notes="- point", resources=[{"label": "Slides", "url": "https://example.com/s.pdf"}]),
                        headers=instructor)
    assert first.status_code == 201 and second.status_code == 201
    lid = first.json()["db_entry_id"]

    rows = client.get("/lecture/get/T101", headers=student).json()
    assert [r["title"] for r in rows] == ["Intro", "Later"]  # sorted by week, not insertion order
    assert rows[0]["youtube_id"] == "fNk_zzaMoSs" and rows[0]["resources"][0]["label"] == "Slides"
    assert [r["title"] for r in client.get("/lecture/get/T101?week=2", headers=student).json()] == ["Later"]

    upd = _body(title="Vectors", youtube_url="https://www.youtube.com/watch?v=kYB8IZa5AuE")
    upd.pop("course_id")
    assert client.put(f"/lecture/update/{lid}", json=upd, headers=student).status_code == 403
    assert client.put(f"/lecture/update/{lid}", json=upd, headers=instructor).status_code == 202
    one = client.get(f"/lecture/one/{lid}", headers=student).json()
    assert one["title"] == "Vectors" and one["youtube_id"] == "kYB8IZa5AuE"

    assert client.delete(f"/lecture/delete/{lid}", headers=student).status_code == 403
    assert client.delete(f"/lecture/delete/{lid}", headers=instructor).status_code == 200
    assert client.delete(f"/lecture/delete/{lid}", headers=instructor).status_code == 404
    assert client.get("/lecture/one/not-an-id", headers=student).status_code == 422


def test_demo_seed_lectures_are_created_once(client, db, instructor):
    seed()
    assert db.lecture.count_documents({}) == len(LECTURES)
    assert {d["course_id"] for d in db.lecture.find()} == {"PY101", "DS201", "ML301"}
    # an instructor renames a seeded lecture and adds their own
    seeded = db.lecture.find_one({"course_id": "DS201", "week": 1, "order": 1})
    upd = {"week": 2, "order": 5, "title": "My edit", "youtube_url": seeded["youtube_url"]}
    assert client.put(f"/lecture/update/{seeded['_id']}", json=upd, headers=instructor).status_code == 202
    client.post("/lecture/create", json={**upd, "course_id": "DS201", "title": "Extra", "youtube_url": "fNk_zzaMoSs"}, headers=instructor)
    seed()
    edited = db.lecture.find_one({"_id": seeded["_id"]})
    assert (edited["title"], edited["week"], edited["order"]) == ("My edit", 2, 5)
    assert db.lecture.count_documents({}) == len(LECTURES) + 1
    seed(reset=True)
    assert db.lecture.count_documents({}) == len(LECTURES)


def test_extra_courses_validate_load_and_grade(db):
    start = datetime(2026, 1, 5, tzinfo=timezone.utc)
    built = [seed_extra_courses.build(m, False, start) for m in seed_extra_courses.COURSES]
    assert all(seed_extra_courses.validate(d) == [] for d in built)
    for _ in range(2):  # idempotent
        for d in built:
            seed_extra_courses.write(db, d)
    assert db.course.count_documents({}) == 3
    assert db.lecture.count_documents({}) == sum(len(d["lectures"]) for d in built) == 38
    assert db.assignment.count_documents({}) == 160 and db.coding_assignment.count_documents({}) == 15
    # every seeded question accepts its own answer key and rejects a wrong answer
    for q in db.assignment.find():
        assert is_correct(q, q["answers"]), q["question"]
        if q["q_type"] == "MCQ":
            wrong = next(o for o in q["options"] if o not in q["answers"])
            assert not is_correct(q, [wrong]), q["question"]
    # re-running later never moves an existing deadline
    later = [seed_extra_courses.build(m, False, datetime(2030, 1, 1, tzinfo=timezone.utc)) for m in seed_extra_courses.COURSES]
    for d in later:
        seed_extra_courses.write(db, d)
    assert db.assignment.find_one({"course_id": "CS01"})["deadline"].year == 2026


def test_extra_courses_dry_run(capsys):
    assert seed_extra_courses.main(["--dry-run"]) == 0
    assert "Dry run" in capsys.readouterr().out
