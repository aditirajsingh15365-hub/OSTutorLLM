import logging
import os
import shutil
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
    session_id: str = Form(...),
    scope: str = Form("user")
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File format '{ext}' not supported. Allowed formats: .pdf, .md, .txt"
        )

    # Save to user uploads temp folder
    target_dir = rag_service.user_docs_dir if scope == "user" else rag_service.official_docs_dir
    os.makedirs(target_dir, exist_ok=True)

    safe_filename = os.path.basename(file.filename)
    stored_name = f"{session_id}_{safe_filename}" if scope == "user" else safe_filename
    file_path = os.path.join(target_dir, stored_name)

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
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {str(e)}")

    # Ingest document into vector store
    try:
        doc_info = rag_service.ingest_document(
            file_path=file_path,
            filename=safe_filename,
            scope=scope,
            session_id=session_id
        )
        return doc_info
    except Exception as e:
        logger.error(f"Extraction or indexing failed for {file.filename}: {e}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=422, detail=f"Extraction failed: {str(e)}")


@router.get("", response_model=List[DocumentInfo])
def list_documents(session_id: Optional[str] = Query(None)):
    try:
        return rag_service.list_documents(session_id=session_id)
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve documents")


@router.delete("/{doc_id}")
def delete_document(doc_id: str, session_id: Optional[str] = Query(None)):
    success = rag_service.delete_document(doc_id=doc_id, session_id=session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    return {"status": "deleted", "doc_id": doc_id}

