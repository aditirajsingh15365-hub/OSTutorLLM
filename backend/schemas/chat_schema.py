from pydantic import BaseModel
from typing import List, Optional

class Message(BaseModel):
    role: str
    content: str

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
