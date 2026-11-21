"""Small constructors so the course data files stay readable.

Every helper returns plain dicts in the same shape the API stores, so the seed
script can insert them without going through HTTP.
"""


def lecture(week, order, title, youtube_id, source, description, notes, resources):
    return {
        "week": week,
        "order": order,
        "title": title,
        "youtube_url": f"https://www.youtube.com/watch?v={youtube_id}",
        "youtube_id": youtube_id,
        "source": source,
        "description": description,
        "notes": notes.strip(),
        "duration": None,
        "resources": list(resources),
    }


def mcq(question, options, answer):
    assert answer in options, f"MCQ answer not among options: {question}"
    return {"question": question, "q_type": "MCQ", "options": options, "answers": [answer]}


def msq(question, options, answers):
    assert all(a in options for a in answers), f"MSQ answer not among options: {question}"
    # Keep answers in option order: the grader compares lists exactly and the
    # student page submits selections in option order.
    ordered = [o for o in options if o in answers]
    return {"question": question, "q_type": "MSQ", "options": options, "answers": ordered}


def num(question, answer):
    # Stored as a string because the student page submits text-field values.
    return {"question": question, "q_type": "Numeric", "options": [], "answers": [str(answer)]}


def code(question, public, private, language="python"):
    as_cases = lambda pairs: [{"input": i, "output": o} for i, o in pairs]
    return {
        "question": question,
        "language": language,
        "public_testcase": as_cases(public),
        "private_testcase": as_cases(private),
    }


def note(week, title, html):
    return {"week": week, "title": title, "content": html.strip(), "url": None}
