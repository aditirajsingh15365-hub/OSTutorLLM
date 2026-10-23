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

# HTTP status codes that mean "this model is unavailable or quota exhausted right now, try the fallback
# model instead of retrying it".
FALLBACK_STATUS_CODES = {503, 429}


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

    def generate_response(
        self,
        user_msg: str,
        mode: str,
        history: Optional[List[dict]] = None,
        rag_context: Optional[str] = None,
        grounding_status: str = "none",
        exam_policy: str = "ai_enhanced"
    ) -> LLMResult:
        if settings.LLM_MODE.lower() == "mock":
            return LLMResult(
                response=self._mock_response(user_msg, mode, grounding_status),
                model="mock",
                primary_model="mock",
            )
        return self._real_response(user_msg, mode, history, rag_context, grounding_status, exam_policy)

    def _mock_response(self, prompt: str, mode: str, grounding_status: str = "none") -> TutorLLMResponse:
        return TutorLLMResponse(
            answer=f"[Mock {mode} response | Grounding: {grounding_status}] Based on Operating Systems principles and verified notes, here is the explanation for: '{prompt}'.",
            follow_up_question="Mock: Can you explain the main trade-off in your own words?",
            suggestion="Mock: Next related OS topic"
        )

    @staticmethod
    def _build_system_prompt(
        mode: str,
        rag_context: Optional[str] = None,
        grounding_status: str = "none",
        exam_policy: str = "ai_enhanced"
    ) -> str:
        prompt = (
            "You are an academic Operating Systems tutor. You must behave like a university teacher. "
            f"Your responses must match the requested learning mode: {mode}.\n\n"
            "TUTORING PROGRESSION RULES:\n"
            "1. Explain -> Check understanding -> Wait for response -> Evaluate -> Adapt -> Ask next.\n"
            "2. If the student is confused: Explain -> Simplify -> Analogy -> Check understanding.\n"
            "3. If the student is correct: Acknowledge -> Deepen -> Next question.\n"
            "4. If the student asks a new question: Answer the new question rather than forcing the previous follow-up.\n\n"
        )

        if mode == "exam_5":
            prompt += (
                "EXAM 5-MARK CRITERIA:\n"
                "- Write a high-yield, structured 5-mark answer.\n"
                "- Include: Definition, 3-5 core points/conditions, and concise conclusion.\n"
                "- Use bold headings and clean bullet points.\n\n"
            )
        elif mode == "exam_10":
            prompt += (
                "EXAM 10-MARK CRITERIA:\n"
                "- Write a comprehensive, university-standard 10-mark answer.\n"
                "- Include: Formal Definition, Architecture/Components, Step-by-Step Mechanisms, Criteria/Conditions, and Trade-offs.\n"
                "- Structure into clear numbered headings.\n\n"
            )

        if rag_context and grounding_status == "sufficient":
            prompt += (
                "GROUNDING: SUFFICIENT COURSE PASSAGES AVAILABLE\n"
                "- Ground your answer in the verified course excerpts provided below.\n"
                "- When student notes (USER MATERIAL) are present, prioritize their specific syllabus structure, slide numbers, and terminology.\n"
                "- Clearly distinguish between OFFICIAL MATERIAL (e.g. Silberschatz textbook) and USER MATERIAL (student uploaded slides/notes). Never call the official textbook the student's upload.\n"
                "- Preserve verified definitions and conditions. Synthesize clearly rather than blindly copying.\n\n"
            )
        elif rag_context and grounding_status == "partial":
            prompt += (
                "GROUNDING: PARTIAL COURSE PASSAGES AVAILABLE\n"
                "- Some claims are supported by the provided course passages below.\n"
                "- Use the notes for supported claims. Supplement gaps with general OS knowledge, but clearly distinguish note-backed facts from general AI additions.\n"
                "- Distinguish OFFICIAL MATERIAL from USER MATERIAL accurately.\n\n"
            )
        elif grounding_status == "fallback":
            if exam_policy == "strict":
                prompt += (
                    "GROUNDING: STRICT NOTES-ONLY (NO MATCH)\n"
                    "- The student requested strict notes-based answering, but no course notes were found covering this topic.\n"
                    "- State clearly that the supplied course notes do not cover this topic. Do not fabricate citations.\n\n"
                )
            else:
                prompt += (
                    "GROUNDING: GENERAL AI FALLBACK\n"
                    "- No matching course notes found. Explain using general OS principles. Do not invent fake citations.\n\n"
                )

        if rag_context:
            prompt += (
                "VERIFIED COURSE MATERIAL EXCERPTS:\n"
                "--------------------------------------------------\n"
                f"{rag_context}\n"
                "--------------------------------------------------\n\n"
            )

        prompt += (
            "IMPORTANT OUTPUT RULES:\n"
            "- Put your main explanation in the 'answer' field.\n"
            "- Do NOT ask questions inside the 'answer' field.\n"
            "- Place ONE single check-for-understanding question in the 'follow_up_question' field, but ONLY if appropriate.\n"
            "- Place a recommendation in the 'suggestion' field, but ONLY if appropriate.\n"
            "- Do not mechanically attach a follow-up or suggestion to every response if it interrupts a natural flow."
        )
        return prompt

    @staticmethod
    def _build_contents(user_msg: str, history: Optional[List[dict]]) -> List[types.Content]:
        contents = []
        for msg in history or []:
            if msg["role"] == "user":
                role, text = "user", msg["content"]
            else:
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

    def _real_response(
        self,
        user_msg: str,
        mode: str,
        history: Optional[List[dict]],
        rag_context: Optional[str] = None,
        grounding_status: str = "none",
        exam_policy: str = "ai_enhanced"
    ) -> LLMResult:
        if not self.client:
            logger.error("LLM_MODE is not 'mock' but GEMINI_API_KEY is not set")
            raise LLMServiceError(
                "The tutor isn't configured yet (missing API key on the server).",
                status_code=503,
            )

        contents = self._build_contents(user_msg, history)
        config = types.GenerateContentConfig(
            system_instruction=self._build_system_prompt(mode, rag_context, grounding_status, exam_policy),
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
