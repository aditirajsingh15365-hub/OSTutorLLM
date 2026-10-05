from core.config import settings
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import Optional, List

class TutorLLMResponse(BaseModel):
    answer: str = Field(description="The main educational explanation or answer, formatted in Markdown. Do NOT include follow-up questions in this text.")
    follow_up_question: Optional[str] = Field(description="A single check-for-understanding question if appropriate for the conversation flow. Omit if not appropriate.", default=None)
    suggestion: Optional[str] = Field(description="A highly relevant suggested next topic. Omit if not appropriate.", default=None)

class LLMService:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        else:
            self.client = None

    def generate_response(self, user_msg: str, mode: str, history: List[dict] = None) -> TutorLLMResponse:
        if settings.LLM_MODE.lower() == "mock":
            return self._mock_response(user_msg, mode)
        else:
            return self._real_response(user_msg, mode, history)

    def _mock_response(self, prompt: str, mode: str) -> TutorLLMResponse:
        return TutorLLMResponse(
            answer=f"[Mock {mode} response] Based on your query, here is an explanation about OS concepts.",
            follow_up_question="Mock: Do you understand?",
            suggestion="Mock: Next topic"
        )

    def _real_response(self, user_msg: str, mode: str, history: List[dict]) -> TutorLLMResponse:
        if not self.client:
            return TutorLLMResponse(answer="Error: No API key configured. Set GEMINI_API_KEY in .env")
        
        system_prompt = (
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

        contents = []
        if history:
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg["content"])]))
        
        # Add the current user message
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_msg)]))

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=TutorLLMResponse,
            temperature=0.7
        )

        try:
            response = self.client.models.generate_content(
                model="gemini-3.8-flash",
                contents=contents,
                config=config
            )
            try:
                if hasattr(response, 'parsed') and response.parsed:
                    return response.parsed
                import json
                data = json.loads(response.text)
                return TutorLLMResponse(**data)
            except Exception as e:
                import json
                data = json.loads(response.text)
                return TutorLLMResponse(**data)

        except Exception as e:
            try:
                response = self.client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=contents,
                    config=config
                )
                if hasattr(response, 'parsed') and response.parsed:
                    return response.parsed
                import json
                data = json.loads(response.text)
                return TutorLLMResponse(**data)
            except Exception as e2:
                return TutorLLMResponse(answer=f"Error communicating with LLM: {str(e)} | {str(e2)}")
