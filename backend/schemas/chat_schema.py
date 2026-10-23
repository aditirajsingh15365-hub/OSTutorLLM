from pydantic import BaseModel
from typing import List, Optional


class Message(BaseModel):
    role: str
    content: str
    # For tutor messages: the check-for-understanding question that was shown
    # with this message, so the LLM knows what the student is answering.
    follow_up_question: Optional[str] = None


class SourceCitation(BaseModel):
    doc_id: str
    document_title: str
    page: Optional[int] = None
    excerpt: str
    scope: str  # "official" | "user"
    score: Optional[float] = None


class DocumentInfo(BaseModel):
    doc_id: str
    filename: str
    file_type: str
    scope: str  # "official" | "user"
    session_id: Optional[str] = None
    chunk_count: int
    page_count: Optional[int] = None
    created_at: str
    size_bytes: int


class ChatRequest(BaseModel):
    session_id: str
    message: str
    learning_mode: str
    conversation_history: Optional[List[Message]] = []
    # RAG options
    source_scope: Optional[str] = "both"  # "official", "user", "both", "general"
    exam_policy: Optional[str] = "ai_enhanced"  # "strict", "ai_enhanced"


class ChatResponse(BaseModel):
    session_id: str
    topic: str
    answer: str
    follow_up_question: Optional[str] = None
    suggestion: Optional[str] = None
    mode: str
    # Which model answered. fallback_used is True when the primary model was
    # overloaded (503) and the lite model answered this response instead.
    model_used: Optional[str] = None
    primary_model: Optional[str] = None
    fallback_used: bool = False
    # RAG Grounding metadata
    grounding_status: Optional[str] = "none"  # "sufficient", "partial", "fallback", "none"
    citations: Optional[List[SourceCitation]] = []
