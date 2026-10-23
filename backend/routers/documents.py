import logging
import os
import re
import uuid
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from core.config import settings
from schemas.chat_schema import DocumentInfo
from services.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt"}


@router.post("/upload", response_model=DocumentInfo)
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form(..., min_length=1, max_length=128)
):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", session_id):
        raise HTTPException(status_code=400, detail="Invalid session identifier")
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    # Original names are display metadata only. Normalize both path separators,
    # then use a server-generated token for every filesystem operation.
    display_name = file.filename.replace("\\", "/").split("/")[-1].strip()
    if not display_name or len(display_name) > 255 or any(ord(char) < 32 for char in display_name):
        raise HTTPException(status_code=400, detail="Invalid filename")
    ext = os.path.splitext(display_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File format '{ext}' not supported. Allowed formats: .pdf, .md, .txt"
        )

    # Public uploads can only create session-owned user notes.
    scope = "user"
    target_dir = os.path.realpath(rag_service.user_docs_dir)
    os.makedirs(target_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.realpath(os.path.join(target_dir, stored_name))
    if os.path.commonpath([target_dir, file_path]) != target_dir:
        raise HTTPException(status_code=400, detail="Invalid upload path")

    # Check size and stream file
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    total_bytes = 0

    try:
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(1024 * 64):  # 64KB chunks
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    buffer.close()
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum size limit of {settings.MAX_UPLOAD_SIZE_MB}MB"
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Upload could not be saved")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Could not save this upload.")

    # Ingest document into vector store
    try:
        doc_info = rag_service.ingest_document(
            file_path=file_path,
            filename=display_name,
            scope=scope,
            session_id=session_id,
            storage_name=stored_name,
        )
        return doc_info
    except Exception:
        logger.exception("Extraction or indexing failed for %s", display_name)
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=422, detail="Could not extract or index this document. Check that the file is readable.")


@router.get("", response_model=List[DocumentInfo])
def list_documents(session_id: Optional[str] = Query(None)):
    if session_id is not None and not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", session_id):
        raise HTTPException(status_code=400, detail="Invalid session identifier")
    try:
        return rag_service.list_documents(session_id=session_id)
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve documents")


@router.delete("/{doc_id}")
def delete_document(doc_id: str, session_id: str = Query(..., min_length=1, max_length=128)):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", session_id):
        raise HTTPException(status_code=400, detail="Invalid session identifier")
    success = rag_service.delete_document(doc_id=doc_id, session_id=session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    return {"status": "deleted", "doc_id": doc_id}

