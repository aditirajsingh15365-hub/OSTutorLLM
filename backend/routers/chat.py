from fastapi import APIRouter, Depends
from schemas.chat_schema import ChatRequest, ChatResponse
from services.tutor_service import TutorController

router = APIRouter()
tutor_controller = TutorController()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    return tutor_controller.process_chat(request)
