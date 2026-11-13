class AIError(Exception):
    """Base class for AI layer failures."""


class AINotConfigured(AIError):
    """No API key / provider configured."""


class AIProviderError(AIError):
    """Upstream provider failed (network, quota, bad response)."""


class AIOutputError(AIError):
    """The model did not return valid structured output, even after a retry."""


def to_http(exc: Exception):
    """Map an AI failure to a friendly HTTP error (never leaks provider internals)."""
    from fastapi import HTTPException

    if isinstance(exc, AINotConfigured):
        return HTTPException(status_code=503, detail="AI features are not configured on this server.")
    if isinstance(exc, AIOutputError):
        return HTTPException(status_code=502, detail=str(exc))
    return HTTPException(status_code=502, detail="The AI service is temporarily unavailable. Please try again.")
