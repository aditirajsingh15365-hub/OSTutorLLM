import io
import os
import pytest
from fastapi.testclient import TestClient

from core.config import settings
from main import app
from schemas.chat_schema import ChatRequest
from services.rag_service import rag_service

client = TestClient(app)


def test_rag_ingest_and_retrieve_markdown():
    # Ingest test course note
    temp_note = os.path.join(rag_service.official_docs_dir, "test_deadlock_note.md")
    with open(temp_note, "w", encoding="utf-8") as f:
        f.write("# Deadlock Prevention\n\nDeadlock prevention ensures that at least one of the four Coffman conditions cannot hold.\nThese four conditions are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.")

    doc = None
    session_id = "rag_test_owner"
    try:
        doc = rag_service.ingest_document(
            file_path=temp_note,
            filename="test_deadlock_note.md",
            scope="user",
            session_id=session_id
        )
        assert doc.chunk_count > 0
        assert doc.scope == "user"

        # Query relevant topic
        res = rag_service.retrieve(
            query="What are the Coffman conditions for deadlocks?",
            session_id=session_id,
            source_scope="user"
        )
        assert res.status in ["sufficient", "partial"]
        assert len(res.citations) > 0
        assert "Deadlock" in res.citations[0].document_title or "test" in res.citations[0].document_title.lower()
    finally:
        if os.path.exists(temp_note):
            os.remove(temp_note)
        if doc:
            rag_service.delete_document(doc.doc_id, session_id=session_id)


def test_student_document_isolation():
    # Student 1 uploads a private note
    session_1 = "student_alpha_123"
    session_2 = "student_beta_456"

    temp_s1 = os.path.join(rag_service.user_docs_dir, f"{session_1}_custom_mutex.md")
    with open(temp_s1, "w", encoding="utf-8") as f:
        f.write("Secret Peterson Solution: Flag array and turn variable ensure strict alternation and progress.")

    doc_1 = None
    try:
        doc_1 = rag_service.ingest_document(
            file_path=temp_s1,
            filename="custom_mutex.md",
            scope="user",
            session_id=session_1
        )

        # Student 1 queries their own notes
        res_s1 = rag_service.retrieve(
            query="Explain Peterson Solution flag and turn",
            session_id=session_1,
            source_scope="user"
        )
        assert len(res_s1.citations) > 0
        assert any(c.doc_id == doc_1.doc_id for c in res_s1.citations)

        # Student 2 queries user notes - MUST NOT see Student 1's doc
        res_s2 = rag_service.retrieve(
            query="Explain Peterson Solution flag and turn",
            session_id=session_2,
            source_scope="user"
        )
        assert not any(c.doc_id == doc_1.doc_id for c in res_s2.citations)

        # Student 2 tries to delete Student 1's doc - MUST BE REJECTED
        del_attempt = rag_service.delete_document(doc_id=doc_1.doc_id, session_id=session_2)
        assert del_attempt is False

    finally:
        if doc_1:
            rag_service.delete_document(doc_id=doc_1.doc_id, session_id=session_1)
        if os.path.exists(temp_s1):
            os.remove(temp_s1)


def test_document_upload_and_delete_endpoints():
    session_id = "test_upload_session"
    content = b"# Virtual Memory\n\nThrashing occurs when the system spends more time paging than executing instructions."
    file_payload = ("test_virtual_mem.md", io.BytesIO(content), "text/markdown")

    # Upload document
    response = client.post(
        "/api/documents/upload",
        data={"session_id": session_id, "scope": "user"},
        files={"file": file_payload}
    )
    assert response.status_code == 200
    doc_data = response.json()
    doc_id = doc_data["doc_id"]
    assert doc_data["filename"] == "test_virtual_mem.md"
    assert doc_data["scope"] == "user"

    # List documents
    list_res = client.get(f"/api/documents?session_id={session_id}")
    assert list_res.status_code == 200
    docs = list_res.json()
    assert any(d["doc_id"] == doc_id for d in docs)

    # Delete document
    del_res = client.delete(f"/api/documents/{doc_id}?session_id={session_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # Confirm removal from list
    list_res_after = client.get(f"/api/documents?session_id={session_id}")
    assert not any(d["doc_id"] == doc_id for d in list_res_after.json())


def test_upload_unsupported_format_rejected():
    response = client.post(
        "/api/documents/upload",
        data={"session_id": "test_session", "scope": "user"},
        files={"file": ("malicious.exe", io.BytesIO(b"executable code"), "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "not supported" in response.json()["detail"]


def test_invalid_retrieval_scope_fails_closed(monkeypatch):
    class SpyCollection:
        def __init__(self):
            self.calls = []

        def query(self, **kwargs):
            self.calls.append(kwargs)
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

    spy = SpyCollection()
    monkeypatch.setattr(rag_service, "collection", spy)
    result = rag_service.retrieve("private notes", session_id="attacker", source_scope="invalid")
    assert result.citations == []
    assert spy.calls == []


def test_retrieval_excludes_low_relevance_citations(monkeypatch):
    class FakeCollection:
        def query(self, **kwargs):
            assert kwargs["where"] == {"scope": "official"}
            return {
                "documents": [["process details", "unrelated deadlock passage"]],
                "metadatas": [[
                    {"doc_id": "relevant", "document_title": "Process notes", "scope": "official"},
                    {"doc_id": "unrelated", "document_title": "Deadlock notes", "scope": "official"},
                ]],
                "distances": [[0.2, 0.9]],
            }

    monkeypatch.setattr(rag_service, "collection", FakeCollection())
    result = rag_service.retrieve("process details", source_scope="official")
    assert [citation.doc_id for citation in result.citations] == ["relevant"]
    assert "unrelated deadlock" not in result.context_text


def test_official_delete_and_vector_failure_do_not_remove_registry(monkeypatch):
    class Collection:
        def __init__(self, fail=False):
            self.fail = fail

        def delete(self, **kwargs):
            if self.fail:
                raise RuntimeError("vector store unavailable")

    registry = {
        "official-id": {"scope": "official", "session_id": None},
        "user-id": {"scope": "user", "session_id": "owner"},
    }
    saved = []
    monkeypatch.setattr(rag_service, "_load_registry", lambda: dict(registry))
    monkeypatch.setattr(rag_service, "_save_registry", lambda value: saved.append(value))
    monkeypatch.setattr(rag_service, "collection", Collection())
    assert rag_service.delete_document("official-id", session_id="attacker") is False
    assert saved == []

    monkeypatch.setattr(rag_service, "collection", Collection(fail=True))
    assert rag_service.delete_document("user-id", session_id="owner") is False
    assert saved == []


def test_upload_cannot_create_official_docs_or_escape_upload_directory(monkeypatch, tmp_path):
    uploads = tmp_path / "user_uploads"
    official = tmp_path / "official"
    uploads.mkdir()
    official.mkdir()
    monkeypatch.setattr(rag_service, "user_docs_dir", str(uploads))
    monkeypatch.setattr(rag_service, "official_docs_dir", str(official))

    response = client.post(
        "/api/documents/upload",
        data={"session_id": "safe_session", "scope": "official"},
        files={"file": ("../../official.md", io.BytesIO(b"# User note\nThis is a longer course note used for upload path testing."), "text/markdown")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["scope"] == "user"
    assert data["filename"] == "official.md"
    stored_files = list(uploads.iterdir())
    assert len(stored_files) == 1
    assert stored_files[0].name != data["filename"]
    assert list(official.iterdir()) == []
    deleted = client.delete(f"/api/documents/{data['doc_id']}?session_id=safe_session")
    assert deleted.status_code == 200

    escaped = client.post(
        "/api/documents/upload",
        data={"session_id": "../../outside"},
        files={"file": ("safe.md", io.BytesIO(b"safe"), "text/markdown")},
    )
    assert escaped.status_code == 400


def test_chat_with_rag_citations_in_mock_mode():
    payload = {
        "session_id": "rag_session_test",
        "message": "What is thrashing in virtual memory?",
        "learning_mode": "exam_5",
        "source_scope": "both",
        "exam_policy": "ai_enhanced"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "rag_session_test"
    assert "grounding_status" in data
    assert "citations" in data
    assert isinstance(data["citations"], list)

