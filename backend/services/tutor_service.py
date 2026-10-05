from schemas.chat_schema import ChatRequest, ChatResponse
from services.llm_service import LLMService
from services.topic_service import TopicService

class TutorController:
    def __init__(self):
        self.llm_service = LLMService()
        self.topic_service = TopicService()

    def process_chat(self, request: ChatRequest) -> ChatResponse:
        topic = self.topic_service.detect_topic(request.message)
        
        # Convert history from Pydantic to dict for LLM service
        history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
        
        # Generate structured response from LLM
        llm_response = self.llm_service.generate_response(
            user_msg=request.message, 
            mode=request.learning_mode, 
            history=history
        )
        
        return ChatResponse(
            session_id=request.session_id,
            topic=topic,
            answer=llm_response.answer,
            follow_up_question=llm_response.follow_up_question,
            suggestion=llm_response.suggestion,
            mode=request.learning_mode
        )
