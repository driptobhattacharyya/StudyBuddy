class AIError(Exception):
    """Base class for AI layer failures."""


class AINotConfigured(AIError):
    """No API key / provider configured."""


class AIProviderError(AIError):
    """Upstream provider failed (network, quota, bad response)."""


class AIOutputError(AIError):
    """The model did not return valid structured output, even after a retry."""
