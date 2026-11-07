"""HTTP error helpers. All errors serialise to ``{"detail": "<message>"}``."""
from fastapi import HTTPException


class UserNotFound(HTTPException):
    def __init__(self, error_message: str = "User not found"):
        super().__init__(status_code=404, detail=error_message)


class NotFoundError(HTTPException):
    def __init__(self, error_message: str = "Not found"):
        super().__init__(status_code=404, detail=error_message)


class AlreadyExistsError(HTTPException):
    def __init__(self, error_message: str = "Entity already exists"):
        super().__init__(status_code=409, detail=error_message)


class NotExistsError(HTTPException):
    def __init__(self, error_message: str = "Could not find the requested resource"):
        super().__init__(status_code=404, detail=error_message)


def bad_request(message: str) -> HTTPException:
    return HTTPException(status_code=400, detail=message)
