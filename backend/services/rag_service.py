import hashlib
import json
import logging
import os
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional, Tuple

import chromadb
from pypdf import PdfReader

from core.config import settings
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
from schemas.chat_schema import DocumentInfo, SourceCitation

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    status: str  # "sufficient", "partial", "fallback"
    citations: List[SourceCitation]
    context_text: str
    official_count: int
    user_count: int


class RAGService:
    def __init__(self, vector_dir: Optional[str] = None, docs_dir: Optional[str] = None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.vector_dir = vector_dir or os.path.join(base_dir, settings.RAG_VECTOR_DIR)
        self.docs_dir = docs_dir or os.path.join(base_dir, settings.RAG_DOCS_DIR)
        
        self.official_docs_dir = os.path.join(self.docs_dir, "official")
        self.user_docs_dir = os.path.join(self.docs_dir, "user_uploads")
        
        os.makedirs(self.vector_dir, exist_ok=True)
        os.makedirs(self.official_docs_dir, exist_ok=True)
        os.makedirs(self.user_docs_dir, exist_ok=True)
        
        self.metadata_file = os.path.join(self.docs_dir, "documents_registry.json")
        try:
            self.embedding_fn = ONNXMiniLM_L6_V2()
            logger.info("Initialized ONNXMiniLM_L6_V2 embedding model (sentence-transformers/all-MiniLM-L6-v2)")
        except Exception as e:
            logger.warning(f"Failed to initialize ONNXMiniLM, falling back to default: {e}")
            self.embedding_fn = None

        self._init_client()
        self._sync_official_documents()

    def _init_client(self):
        try:
            self.chroma_client = chromadb.PersistentClient(path=self.vector_dir)
            self.collection = self.chroma_client.get_or_create_collection(
                name="os_course_materials",
                embedding_function=self.embedding_fn,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("ChromaDB collection initialized with all-MiniLM-L6-v2 embeddings")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            self.chroma_client = None
            self.collection = None

    def _load_registry(self) -> dict:
        if os.path.exists(self.metadata_file):
            try:
                with open(self.metadata_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error reading registry: {e}")
        return {}

    def _save_registry(self, registry: dict):
        temp_path = f"{self.metadata_file}.{uuid.uuid4().hex}.tmp"
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(registry, f, indent=2)
            os.replace(temp_path, self.metadata_file)
        except Exception:
            try:
                os.remove(temp_path)
            except OSError:
                pass
            raise

    # =========================================================================
    # Text Extraction & Chunking
    # =========================================================================

    def _extract_text_from_pdf(self, file_path: str) -> List[Tuple[int, str]]:
        """Returns list of (page_number, text) tuples. Page numbers are 1-indexed."""
        pages_content = []
        try:
            reader = PdfReader(file_path)
            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                text = re.sub(r"\s+", " ", text).strip()
                if text:
                    pages_content.append((idx + 1, text))
        except Exception as e:
            logger.error(f"Error extracting PDF text from {file_path}: {e}")
            raise ValueError(f"Could not read PDF: {str(e)}")
        return pages_content

    def _extract_text_from_markdown(self, file_path: str) -> List[Tuple[int, str]]:
        """Returns single or section-based list of (page_number, text)."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            cleaned = re.sub(r"\n\s*\n", "\n\n", content).strip()
            return [(1, cleaned)] if cleaned else []
        except Exception as e:
            logger.error(f"Error extracting markdown from {file_path}: {e}")
            raise ValueError(f"Could not read text file: {str(e)}")

    def _chunk_text(self, text: str, page: int, chunk_size: int = 600, overlap: int = 100) -> List[dict]:
        """Splits text into chunks preserving page metadata."""
        if not text:
            return []
        
        chunks = []
        start = 0
        text_len = len(text)
        
        while start < text_len:
            end = min(start + chunk_size, text_len)
            # Try to break at a sentence boundary if possible
            if end < text_len:
                boundary = max(text.rfind(". ", start, end), text.rfind("\n", start, end))
                if boundary > start + (chunk_size // 2):
                    end = boundary + 1

            chunk_str = text[start:end].strip()
            if len(chunk_str) > 30:  # Skip trivial fragments
                chunks.append({
                    "text": chunk_str,
                    "page": page
                })
            
            if end >= text_len:
                break
            start = max(end - overlap, start + 1)
            
        return chunks

    # =========================================================================
    # Document Ingestion
    # =========================================================================

    def ingest_document(
        self,
        file_path: str,
        filename: str,
        scope: str = "user",
        session_id: Optional[str] = None,
        storage_name: Optional[str] = None,
    ) -> DocumentInfo:
        if not self.collection:
            raise RuntimeError("Vector store not available.")
        if scope not in {"official", "user"}:
            raise ValueError("Document scope must be official or user.")
        if scope == "user" and (not session_id or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", session_id)):
            raise ValueError("A valid owner session is required for user documents.")
        if storage_name is not None and not re.fullmatch(r"[0-9a-f]{32}\.(pdf|md|txt)", storage_name):
            raise ValueError("Invalid server-generated storage name.")

        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".pdf", ".md", ".txt"]:
            raise ValueError(f"Unsupported file format: {ext}. Only PDF, Markdown, and TXT allowed.")

        # Extract text by page
        if ext == ".pdf":
            pages_data = self._extract_text_from_pdf(file_path)
        else:
            pages_data = self._extract_text_from_markdown(file_path)

        if not pages_data:
            raise ValueError("Document contains no readable text.")

        doc_id = str(uuid.uuid4())
        all_chunks = []
        for page_num, page_text in pages_data:
            page_chunks = self._chunk_text(page_text, page=page_num)
            all_chunks.extend(page_chunks)

        if not all_chunks:
            raise ValueError("Could not extract meaningful chunks from document.")

        # Prepare vectors for ChromaDB
        ids = []
        documents = []
        metadatas = []
        doc_title = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ").title()

        for idx, chunk in enumerate(all_chunks):
            chunk_id = f"{doc_id}_{idx}"
            ids.append(chunk_id)
            documents.append(chunk["text"])
            metadatas.append({
                "doc_id": doc_id,
                "filename": filename,
                "document_title": doc_title,
                "page": chunk["page"],
                "scope": scope,
                "session_id": session_id or "global",
                "chunk_index": idx
            })

        # Batch insertion into ChromaDB to respect max batch limits
        batch_size = 500
        added_ids = []
        try:
            for b_start in range(0, len(ids), batch_size):
                b_end = b_start + batch_size
                self.collection.add(
                    ids=ids[b_start:b_end],
                    documents=documents[b_start:b_end],
                    metadatas=metadatas[b_start:b_end]
                )
                added_ids.extend(ids[b_start:b_end])
        except Exception:
            if added_ids:
                try:
                    self.collection.delete(ids=added_ids)
                except Exception:
                    logger.exception("Could not roll back partially inserted vectors")
            raise

        file_size = os.path.getsize(file_path)
        doc_info = DocumentInfo(
            doc_id=doc_id,
            filename=filename,
            file_type=ext.replace(".", ""),
            scope=scope,
            session_id=session_id,
            chunk_count=len(all_chunks),
            page_count=len(pages_data),
            created_at=datetime.now(timezone.utc).isoformat(),
            size_bytes=file_size
        )

        # Register document
        registry = self._load_registry()
        registry_record = doc_info.model_dump()
        if storage_name:
            registry_record["storage_name"] = storage_name
        registry[doc_id] = registry_record
        try:
            self._save_registry(registry)
        except Exception:
            try:
                self.collection.delete(where={"doc_id": doc_id})
            except Exception:
                logger.exception("Could not roll back vectors after registry write failure")
            raise

        logger.info(f"Ingested document {filename} ({scope}) with {len(all_chunks)} chunks.")
        return doc_info

    def _sync_official_documents(self):
        """Scans official folder and indexes any new documents found on startup."""
        if not self.collection:
            return
        
        registry = self._load_registry()
        existing_filenames = {d["filename"] for d in registry.values() if d.get("scope") == "official"}

        if not os.path.exists(self.official_docs_dir):
            return

        for fname in os.listdir(self.official_docs_dir):
            ext = os.path.splitext(fname)[1].lower()
            if ext in [".pdf", ".md", ".txt"] and fname not in existing_filenames:
                fpath = os.path.join(self.official_docs_dir, fname)
                try:
                    logger.info(f"Auto-ingesting new official course document: {fname}")
                    self.ingest_document(
                        file_path=fpath,
                        filename=fname,
                        scope="official",
                        session_id=None
                    )
                except Exception as e:
                    logger.warning(f"Could not auto-ingest {fname}: {e}")

    # =========================================================================
    # Document Management & Deletion
    # =========================================================================

    def list_documents(self, session_id: Optional[str] = None) -> List[DocumentInfo]:
        registry = self._load_registry()
        results = []
        for doc_data in registry.values():
            scope = doc_data.get("scope")
            doc_session = doc_data.get("session_id")
            
            # Include official materials OR materials owned by this specific student session
            if scope == "official" or (session_id and doc_session == session_id):
                results.append(DocumentInfo(**doc_data))
        return results

    def delete_document(self, doc_id: str, session_id: Optional[str] = None) -> bool:
        if not self.collection:
            return False

        registry = self._load_registry()
        if doc_id not in registry:
            return False

        doc_data = registry[doc_id]
        if doc_data.get("scope") != "user":
            logger.warning("Public deletion is restricted to user documents: %s", doc_id)
            return False
        # Authorization check: only owner session can delete user uploads
        if not session_id or doc_data.get("session_id") != session_id:
            logger.warning(f"Unauthorized deletion attempt for doc {doc_id} by session {session_id}")
            return False

        # 1. Remove from ChromaDB collection
        try:
            self.collection.delete(where={"doc_id": doc_id})
        except Exception as e:
            logger.error(f"Error deleting vectors for {doc_id}: {e}")
            return False

        # 2. Remove physical file if in user uploads
        storage_name = doc_data.get("storage_name")
        if storage_name and re.fullmatch(r"[0-9a-f]{32}\.(pdf|md|txt)", storage_name):
            user_path = os.path.join(self.user_docs_dir, storage_name)
            if os.path.exists(user_path):
                try:
                    os.remove(user_path)
                except OSError as e:
                    logger.error("Could not remove stored upload for %s: %s", doc_id, e)
                    return False

        # 3. Remove from registry
        del registry[doc_id]
        try:
            self._save_registry(registry)
        except Exception as e:
            logger.error("Could not update registry after deleting vectors for %s: %s", doc_id, e)
            return False
        logger.info(f"Deleted document {doc_id} and associated vector embeddings.")
        return True

    # =========================================================================
    # Adaptive Retrieval & Evaluation
    # =========================================================================

    def retrieve(
        self,
        query: str,
        session_id: Optional[str] = None,
        source_scope: str = "both",
        top_k: int = 4
    ) -> RetrievalResult:
        """Adaptive retrieval with strict security boundaries and coverage analysis."""
        if source_scope not in {"official", "user", "both", "general"}:
            logger.warning("Rejected invalid retrieval scope %r", source_scope)
            return RetrievalResult(status="fallback", citations=[], context_text="", official_count=0, user_count=0)
        if not self.collection or source_scope == "general":
            return RetrievalResult(
                status="fallback",
                citations=[],
                context_text="",
                official_count=0,
                user_count=0
            )

        # Build strict metadata filter
        where_filter = None
        if source_scope == "official":
            where_filter = {"scope": "official"}
        elif source_scope == "user":
            if not session_id:
                # No session provided, cannot access user docs
                return RetrievalResult(status="fallback", citations=[], context_text="", official_count=0, user_count=0)
            where_filter = {"$and": [{"scope": "user"}, {"session_id": session_id}]}
        elif source_scope == "both":
            if session_id:
                where_filter = {
                    "$or": [
                        {"scope": "official"},
                        {"$and": [{"scope": "user"}, {"session_id": session_id}]}
                    ]
                }
            else:
                where_filter = {"scope": "official"}
        if where_filter is None:
            # Fail closed: every vector query must be scoped to official material
            # or to the requesting session's own uploads.
            return RetrievalResult(status="fallback", citations=[], context_text="", official_count=0, user_count=0)

        # Expand common OS acronyms for semantic retrieval
        expanded_query = query
        acronym_map = {
            r"\brag\b": "resource allocation graph (RAG)",
            r"\bpcb\b": "process control block (PCB)",
            r"\btlb\b": "translation lookaside buffer (TLB)",
            r"\bmmu\b": "memory management unit (MMU)",
            r"\bfcfs\b": "first come first served (FCFS)",
            r"\bsjf\b": "shortest job first (SJF)",
            r"\bsrtf\b": "shortest remaining time first (SRTF)",
            r"\brr\b": "round robin (RR)",
        }
        for pattern, expansion in acronym_map.items():
            if re.search(pattern, expanded_query, re.IGNORECASE):
                expanded_query = f"{expanded_query} {expansion}"

        try:
            # Query vector store
            query_args = {
                "query_texts": [expanded_query],
                "n_results": top_k
            }
            query_args["where"] = where_filter

            results = self.collection.query(**query_args)
        except Exception as e:
            logger.error(f"ChromaDB retrieval error: {e}")
            return RetrievalResult(status="fallback", citations=[], context_text="", official_count=0, user_count=0)

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0] if "distances" in results and results["distances"] else []

        if not documents:
            return RetrievalResult(status="fallback", citations=[], context_text="", official_count=0, user_count=0)

        # Process only passages with a minimum semantic match. Low-score passages
        # must not be presented as evidence or sent to the answer model.
        citations: List[SourceCitation] = []
        context_parts = []
        official_count = 0
        user_count = 0

        # Extract meaningful keywords (length >= 3, excluding common conversational stopwords)
        STOPWORDS = {"teach", "what", "tell", "explain", "about", "give", "help", "with", "from", "show", "does", "mean", "work", "like", "the"}
        raw_words = set(re.findall(r"\b[a-zA-Z0-9_\-]{3,}\b", query.lower()))
        query_words = raw_words - STOPWORDS or raw_words
        matched_keywords = set()

        relevant = []
        for idx, doc_text in enumerate(documents):
            meta = metadatas[idx] if idx < len(metadatas) else {}
            dist = distances[idx] if idx < len(distances) else 1.0
            similarity = max(0.0, min(1.0, 1.0 - dist))
            if similarity < 0.35:
                continue
            relevant.append((idx, doc_text, meta, similarity))

        if not relevant:
            return RetrievalResult(status="fallback", citations=[], context_text="", official_count=0, user_count=0)

        for idx, doc_text, meta, similarity in relevant:

            # Track keyword coverage
            doc_lower = doc_text.lower()
            for qw in query_words:
                if qw in doc_lower or (qw == "rag" and "resource-allocation graph" in doc_lower):
                    matched_keywords.add(qw)

            scope = meta.get("scope", "official")
            if scope == "official":
                official_count += 1
            else:
                user_count += 1

            citation = SourceCitation(
                doc_id=meta.get("doc_id", "unknown"),
                document_title=meta.get("document_title", meta.get("filename", "Course Document")),
                page=meta.get("page"),
                excerpt=doc_text[:280] + ("..." if len(doc_text) > 280 else ""),
                scope=scope,
                score=round(similarity, 3)
            )
            citations.append(citation)

            # Format as reference data; the LLM service passes this separately
            # from system instructions and marks it as untrusted.
            page_label = f", Page {meta.get('page')}" if meta.get("page") else ""
            context_parts.append(
                f"[{idx+1}] Source: {citation.document_title}{page_label} ({scope.upper()} MATERIAL)\n"
                f"\"{doc_text}\""
            )

        # Adaptive evaluation of evidence
        keyword_coverage = len(matched_keywords) / max(len(query_words), 1)
        top_similarity = max((c.score or 0.0) for c in citations)

        logger.info(
            f"RAG Evaluation: Top Sim={top_similarity:.3f}, "
            f"Coverage={keyword_coverage:.2f} ({len(matched_keywords)}/{len(query_words)})"
        )

        if top_similarity >= 0.55 and keyword_coverage >= 0.40:
            status = "sufficient"
        elif top_similarity >= 0.35 or keyword_coverage >= 0.25:
            status = "partial"
        else:
            status = "fallback"

        context_text = "\n\n".join(context_parts)
        return RetrievalResult(
            status=status,
            citations=citations,
            context_text=context_text,
            official_count=official_count,
            user_count=user_count
        )


# Singleton instance
rag_service = RAGService()
