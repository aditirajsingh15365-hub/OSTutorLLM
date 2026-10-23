from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

MAX_HISTORY_CHARS = 20000


class Message(BaseModel):
    role: Literal["user", "tutor"]
    content: str = Field(min_length=1, max_length=4000)
    # For tutor messages: the check-for-understanding question that was shown
    # with this message, so the LLM knows what the student is answering.
    follow_up_question: Optional[str] = Field(default=None, max_length=1000)


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
    session_id: str = Field(min_length=1, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    message: str = Field(min_length=1, max_length=4000)
    learning_mode: Literal[
        "beginner", "detailed", "exam_5", "exam_10", "viva", "example", "code"
    ] = "beginner"
    conversation_history: List[Message] = Field(default_factory=list, max_length=20)
    # RAG options
    source_scope: Literal["official", "user", "both", "general"] = "both"
    exam_policy: Literal["strict", "ai_enhanced"] = "ai_enhanced"

    @field_validator("message")
    @classmethod
    def message_must_contain_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message must contain non-whitespace text.")
        return value

    @model_validator(mode="after")
    def history_must_fit_character_budget(self):
        history_size = sum(
            len(item.content) + len(item.follow_up_question or "")
            for item in self.conversation_history
        )
        if history_size > MAX_HISTORY_CHARS:
            raise ValueError(f"Conversation history must not exceed {MAX_HISTORY_CHARS} characters.")
        return self


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
    grounding_status: Optional[str] = "none"  # "sufficient", "partial", "fallback", "no_match", "none"
    citations: Optional[List[SourceCitation]] = []
