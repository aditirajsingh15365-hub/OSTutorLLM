import { useState, useEffect, useRef, useCallback } from 'react';
import { X, UploadCloud, FileText, Trash2, CheckCircle2, AlertCircle, BookOpen, User, RefreshCw, Loader2 } from 'lucide-react';
import { getDocuments, uploadDocument, deleteDocument } from '../../services/api';

export default function DocumentUploadModal({ isOpen, onClose, sessionId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await getDocuments(sessionId);
      setDocuments(docs);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Could not load course materials.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    getDocuments(sessionId)
      .then((docs) => {
        if (!cancelled) {
          setDocuments(docs);
          setError(null);
        }
      })
      .catch((err) => {
        console.error('Error fetching documents:', err);
        if (!cancelled) setError('Could not load course materials.');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, sessionId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.pdf', '.md', '.txt'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Unsupported file format. Please upload PDF, Markdown (.md), or Text (.txt).`);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File exceeds maximum size limit of 15MB.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccessMsg(null);
      await uploadDocument(file, sessionId);
      setSuccessMsg(`Successfully uploaded and indexed "${file.name}"!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocs();
    } catch (err) {
      console.error('Upload error:', err);
      const detail = err.response?.data?.detail || 'Failed to upload document.';
      setError(detail);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!confirm(`Remove "${filename}" from your course notes?`)) return;

    try {
      setError(null);
      await deleteDocument(docId, sessionId);
      setSuccessMsg(`Removed "${filename}".`);
      await fetchDocs();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Could not delete document.');
    }
  };

  if (!isOpen) return null;

  const officialDocs = documents.filter((d) => d.scope === 'official');
  const userDocs = documents.filter((d) => d.scope === 'user');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200/90 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Course Materials & Notes</h2>
              <p className="text-xs text-slate-500">Manage course material and your private lecture notes. User uploads are not reviewed or verified.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.md,.txt"
              className="hidden"
              id="notes-file-upload"
              disabled={uploading}
            />
            <label htmlFor="notes-file-upload" className="cursor-pointer flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
                {uploading ? <Loader2 size={24} className="animate-spin text-blue-600" /> : <UploadCloud size={24} />}
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {uploading ? 'Extracting, chunking & indexing...' : 'Click to upload your lecture notes or syllabus'}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                Supports PDF, Markdown (.md), or plain text (.txt) up to 15MB
              </span>
            </label>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Student Uploaded Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User size={13} className="text-purple-600" />
                My Uploaded Notes ({userDocs.length})
              </h3>
              <button
                type="button"
                onClick={fetchDocs}
                disabled={loading}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {userDocs.length === 0 ? (
              <div className="text-center py-6 border border-slate-100 rounded-xl bg-slate-50/30 text-xs text-slate-400">
                No personal notes uploaded for this session yet. Upload a PDF above to ground the tutor in your syllabus!
              </div>
            ) : (
              <div className="space-y-2">
                {userDocs.map((doc) => (
                  <div
                    key={doc.doc_id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-slate-300"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{doc.filename}</p>
                        <p className="text-[11px] text-slate-400">
                          {doc.page_count ? `${doc.page_count} pages • ` : ''}
                          {doc.chunk_count} vector chunks • {(doc.size_bytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(doc.doc_id, doc.filename)}
                      title="Delete document and vector embeddings"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Official Course Materials Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <BookOpen size={13} className="text-blue-600" />
              Official Course Materials ({officialDocs.length})
            </h3>

            {officialDocs.length === 0 ? (
              <div className="text-center py-4 border border-slate-100 rounded-xl bg-slate-50/30 text-xs text-slate-400">
                The official corpus is empty. An administrator can add reviewed course PDFs, Markdown, or text files to <code className="bg-slate-100 px-1 py-0.5 rounded">backend/data/documents/official</code> and restart the backend to index them. Only add material that is actually part of the course.
              </div>
            ) : (
              <div className="space-y-2">
                {officialDocs.map((doc) => (
                  <div
                    key={doc.doc_id}
                    className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                        <BookOpen size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{doc.filename}</p>
                        <p className="text-[11px] text-slate-400">
                          Official Curriculum • {doc.chunk_count} vector chunks
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/70 rounded">
                      OFFICIAL CORPUS
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 font-medium text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

