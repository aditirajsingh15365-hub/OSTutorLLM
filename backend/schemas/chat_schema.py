from pydantic import BaseModel
from typing import List, Optional


class Message(BaseModel):
    role: str
    content: str
    # For tutor messages: the check-for-understanding question that was shown
    # with this message, so the LLM knows what the student is answering.
    follow_up_question: Optional[str] = None


class ChatRequest(BaseModel):
    session_id: str
    message: str
    learning_mode: str
    conversation_history: Optional[List[Message]] = []


class ChatResponse(BaseModel):
    session_id: str
    topic: str
    answer: str
    follow_up_question: Optional[str] = None
    suggestion: Optional[str] = None
    mode: str
