from core.config import settings
from schemas.chat_schema import ChatRequest, ChatResponse
from services.llm_service import LLMService
from services.topic_service import TopicService


class TutorController:
    def __init__(self):
        self.llm_service = LLMService()
        self.topic_service = TopicService()

    def process_chat(self, request: ChatRequest) -> ChatResponse:
        # Only keep the most recent messages so the prompt size stays bounded.
        limit = settings.MAX_HISTORY_MESSAGES
        messages = (request.conversation_history or [])
        messages = messages[-limit:] if limit > 0 else []

        history = [
            {
                "role": msg.role,
                "content": msg.content,
                "follow_up_question": msg.follow_up_question,
            }
            for msg in messages
        ]

        # Only the student's own earlier messages are used as topic context: a
        # tutor reply about deadlocks naturally mentions "processes", "resources",
        # etc., which would pull the topic away from what is being taught.
        student_messages = [item["content"] for item in history if item["role"] == "user"]
        topic = self.topic_service.detect_topic(request.message, student_messages)

        # May raise LLMServiceError; the router turns that into an HTTP error.
        result = self.llm_service.generate_response(
            user_msg=request.message,
            mode=request.learning_mode,
            history=history,
        )

        llm_response = result.response
        return ChatResponse(
            session_id=request.session_id,
            topic=topic,
            answer=llm_response.answer,
            follow_up_question=llm_response.follow_up_question,
            suggestion=llm_response.suggestion,
            mode=request.learning_mode,
            model_used=result.model,
            primary_model=result.primary_model,
            fallback_used=result.fallback_used,
        )
