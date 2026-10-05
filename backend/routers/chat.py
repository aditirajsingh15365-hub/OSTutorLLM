from fastapi import APIRouter, HTTPException

from schemas.chat_schema import ChatRequest, ChatResponse
from services.llm_service import LLMServiceError
from services.tutor_service import TutorController

router = APIRouter()
tutor_controller = TutorController()


# Plain `def` (not `async def`): the LLM call is a blocking network request, so
# FastAPI runs this in its thread pool instead of freezing the event loop.
@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    try:
        return tutor_controller.process_chat(request)
    except LLMServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.public_message)
