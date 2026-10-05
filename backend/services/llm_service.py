import json
import logging
import time
from dataclasses import dataclass
from typing import List, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from core.config import settings

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 2
RETRY_DELAY_SECONDS = 1.0

# HTTP status codes that mean "this model is unavailable right now, try the fallback
# model instead of retrying it". Add 429/500/504 here if you want those to fall back too.
FALLBACK_STATUS_CODES = {503}


def _is_unavailable(exc: Exception) -> bool:
    return getattr(exc, "code", None) in FALLBACK_STATUS_CODES


class LLMServiceError(Exception):
    """Raised when the tutor can't produce a response.

    `public_message` is safe to show to the student. Technical details are
    logged on the server and never sent to the client.
    """

    def __init__(self, public_message: str, status_code: int = 502):
        super().__init__(public_message)
        self.public_message = public_message
        self.status_code = status_code


class TutorLLMResponse(BaseModel):
    answer: str = Field(description="The main educational explanation or answer, formatted in Markdown. Do NOT include follow-up questions in this text.")
    follow_up_question: Optional[str] = Field(description="A single check-for-understanding question if appropriate for the conversation flow. Omit if not appropriate.", default=None)
    suggestion: Optional[str] = Field(description="A highly relevant suggested next topic. Omit if not appropriate.", default=None)


@dataclass
class LLMResult:
    """A tutor response plus which model produced it."""

    response: TutorLLMResponse
    model: str
    primary_model: str
    fallback_used: bool = False


class LLMService:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        else:
            self.client = None

    def generate_response(self, user_msg: str, mode: str, history: Optional[List[dict]] = None) -> LLMResult:
        if settings.LLM_MODE.lower() == "mock":
            return LLMResult(
                response=self._mock_response(user_msg, mode),
                model="mock",
                primary_model="mock",
            )
        return self._real_response(user_msg, mode, history)

    def _mock_response(self, prompt: str, mode: str) -> TutorLLMResponse:
        return TutorLLMResponse(
            answer=f"[Mock {mode} response] Based on your query, here is an explanation about OS concepts.",
            follow_up_question="Mock: Do you understand?",
            suggestion="Mock: Next topic"
        )

    @staticmethod
    def _build_system_prompt(mode: str) -> str:
        return (
            "You are an academic Operating Systems tutor. You must behave like a teacher. "
            f"Your responses must match the requested learning mode: {mode}.\n\n"
            "TUTORING PROGRESSION RULES:\n"
            "1. Explain -> Check understanding -> Wait for response -> Evaluate -> Adapt -> Ask next.\n"
            "2. If the student is confused: Explain -> Simplify -> Analogy -> Check understanding.\n"
            "3. If the student is correct: Acknowledge -> Deepen -> Next question.\n"
            "4. If the student asks a new question: Answer the new question rather than forcing the previous follow-up.\n\n"
            "IMPORTANT OUTPUT RULES:\n"
            "- Put your main explanation in the 'answer' field.\n"
            "- Do NOT ask questions inside the 'answer' field.\n"
            "- Place ONE single check-for-understanding question in the 'follow_up_question' field, but ONLY if appropriate.\n"
            "- Place a recommendation in the 'suggestion' field, but ONLY if appropriate.\n"
            "- Do not mechanically attach a follow-up or suggestion to every response if it interrupts a natural flow."
        )

    @staticmethod
    def _build_contents(user_msg: str, history: Optional[List[dict]]) -> List[types.Content]:
        contents = []
        for msg in history or []:
            if msg["role"] == "user":
                role, text = "user", msg["content"]
            else:
                # Replay tutor turns in the same JSON shape the model produces, so it
                # sees the follow-up question it asked without any extra markup it
                # might imitate.
                role = "model"
                text = TutorLLMResponse(
                    answer=msg["content"],
                    follow_up_question=msg.get("follow_up_question"),
                ).model_dump_json(exclude_none=True)
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))

        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_msg)]))
        return contents

    @staticmethod
    def _parse_response(response) -> TutorLLMResponse:
        parsed = getattr(response, "parsed", None)
        if parsed:
            return TutorLLMResponse.model_validate(parsed)
        text = getattr(response, "text", None)
        if not text:
            raise ValueError("Model returned an empty response")
        return TutorLLMResponse(**json.loads(text))

    def _real_response(self, user_msg: str, mode: str, history: Optional[List[dict]]) -> LLMResult:
        if not self.client:
            logger.error("LLM_MODE is not 'mock' but GEMINI_API_KEY is not set")
            raise LLMServiceError(
                "The tutor isn't configured yet (missing API key on the server).",
                status_code=503,
            )

        contents = self._build_contents(user_msg, history)
        config = types.GenerateContentConfig(
            system_instruction=self._build_system_prompt(mode),
            response_mime_type="application/json",
            response_schema=TutorLLMResponse,
            temperature=0.7,
        )

        primary = settings.GEMINI_MODEL
        fallback = (settings.GEMINI_FALLBACK_MODEL or "").strip()

        try:
            answer = self._generate_with_retries(primary, contents, config)
            return LLMResult(response=answer, model=primary, primary_model=primary)
        except Exception as exc:
            last_error = exc

        # Fall back for THIS response only. The next request tries the primary model again.
        if fallback and fallback != primary and _is_unavailable(last_error):
            logger.warning("%s unavailable (%r); using fallback model %s for this response",
                           primary, last_error, fallback)
            try:
                answer = self._generate_with_retries(fallback, contents, config)
                return LLMResult(
                    response=answer, model=fallback, primary_model=primary, fallback_used=True
                )
            except Exception as exc:
                logger.error("Fallback model %s also failed: %r", fallback, exc)
                last_error = exc

        logger.error("LLM request failed", exc_info=last_error)
        raise LLMServiceError(
            "The tutor couldn't generate a response right now. Please try again in a moment.",
            status_code=502,
        ) from last_error

    def _generate_with_retries(self, model: str, contents, config) -> TutorLLMResponse:
        """Call one model, retrying transient errors on that same model.

        A 503 is raised immediately instead of being retried, so the caller can
        switch to the fallback model without waiting.
        """
        last_error = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config,
                )
                return self._parse_response(response)
            except Exception as exc:
                if _is_unavailable(exc):
                    raise
                last_error = exc
                logger.warning("%s attempt %d/%d failed: %r", model, attempt, MAX_ATTEMPTS, exc)
                if attempt < MAX_ATTEMPTS:
                    time.sleep(RETRY_DELAY_SECONDS * attempt)
        raise last_error
