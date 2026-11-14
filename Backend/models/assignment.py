from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, List, Optional, Union

from pydantic import AfterValidator, BaseModel, BeforeValidator, Field, field_validator, model_validator


def _norm_qtype(v):
    if isinstance(v, str) and v.lower() in ("numerical", "numeric"):
        return "Numeric"
    return v


class QuestionType(str, Enum):
    MSQ = "MSQ"
    MCQ = "MCQ"
    Numeric = "Numeric"
    String = "String"
    Float = "Float"


QType = Annotated[QuestionType, BeforeValidator(_norm_qtype)]


class AssignmentType(str, Enum):
    AQ = "AQ"
    PA = "PA"
    GA = "GA"
    PPA = "PPA"
    GrPA = "GrPA"


GENERAL_TYPES = {"AQ", "PA", "GA"}
CODING_TYPES = {"PPA", "GrPA"}


def _utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


Deadline = Annotated[datetime, AfterValidator(_utc), Field(description="Deadline in ISO format (UTC if no zone given)")]
Scalar = Union[int, float, str]


class AssignmentBase(BaseModel):
    question: str = Field(min_length=1, max_length=5000)
    q_type: QType
    options: List[Scalar] = Field(default_factory=list)
    answers: List[Scalar] = Field(default_factory=list)
    assgn_type: AssignmentType
    week: int = Field(ge=0, le=12)
    deadline: Deadline

    @field_validator("assgn_type")
    @classmethod
    def _general_type(cls, v):
        if v.value not in GENERAL_TYPES:
            raise ValueError("assgn_type must be one of AQ, PA, GA")
        return v

    @model_validator(mode="after")
    def _check_choices(self):
        if self.q_type in (QuestionType.MCQ, QuestionType.MSQ):
            if len(self.options) < 2:
                raise ValueError("Choice questions need at least two options")
            if not self.answers:
                raise ValueError("At least one correct answer is required")
            if self.q_type == QuestionType.MCQ and len(self.answers) != 1:
                raise ValueError("MCQ questions must have exactly one correct answer")
            missing = [a for a in self.answers if a not in self.options]
            if missing:
                raise ValueError("Every answer must be one of the options")
        return self


class Assignment(AssignmentBase):
    course_id: str
    evaluated: Optional[bool] = False


class AssignmentUpdate(AssignmentBase):
    pass


class CodeLanguage(str, Enum):
    python = "python"
    java = "java"
    js = "js"
    javascript = "javascript"


class TestCase(BaseModel):
    input: str
    output: str


class ProgrammingBase(BaseModel):
    question: str = Field(min_length=1, max_length=10000)
    language: CodeLanguage
    public_testcase: List[TestCase] = Field(min_length=1)
    private_testcase: List[TestCase] = Field(min_length=1)
    starter_code: str = Field("", max_length=20000, description="Initial code shown in the student's editor")
    assgn_type: AssignmentType
    week: int = Field(ge=0, le=12)
    deadline: Deadline

    @field_validator("assgn_type")
    @classmethod
    def _coding_type(cls, v):
        if v.value not in CODING_TYPES:
            raise ValueError("assgn_type must be one of PPA, GrPA")
        return v



class ProgrammingAssignment(ProgrammingBase):
    course_id: str
    evaluated: Optional[bool] = False


class ProgrammingAssignmentUpdate(ProgrammingBase):
    pass


class AssignmentSubmissionForm(BaseModel):
    assgn_id: str = Field(min_length=24, max_length=24)
    user_id: Optional[str] = None  # ignored: the authenticated user is always used
    answer: list = Field(max_length=100)


class CodingSubmission(BaseModel):
    assgn_id: str = Field(min_length=24, max_length=24)
    code: str = Field(description="Base64 encoded source code", max_length=200_000)
    submit: bool = Field(False, description="false = Run (public tests only, nothing saved); true = Submit (public + "
                                            "private tests, saved and graded)")


class LastSubmission(BaseModel):
    course_id: str
    week: int = Field(ge=1, le=12)
    assgn_type: AssignmentType
