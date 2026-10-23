import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, FileText, CheckCircle2, AlertCircle, Quote } from 'lucide-react';

export default function CitationsCard({ citations = [], groundingStatus = 'none' }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!citations || citations.length === 0) {
    if (groundingStatus === 'no_match') {
      return (
        <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/70 rounded-xl">
          <BookOpen size={13} className="text-amber-600" />
          <span>No course notes matched. Strict notes-only mode did not use general AI knowledge.</span>
        </div>
      );
    }
    if (groundingStatus === 'fallback') {
      return (
        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl">
          <BookOpen size={13} className="text-slate-400" />
          <span>Answered using general Operating Systems principles (No specific notes matched).</span>
        </div>
      );
    }
    return null;
  }

  const isSufficient = groundingStatus === 'sufficient';
  const isPartial = groundingStatus === 'partial';

  return (
    <div className="mt-2.5 w-full bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden transition-all">
      {/* Header button to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {isSufficient && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md">
              <CheckCircle2 size={12} className="text-emerald-600" />
              Course Notes Grounded
            </span>
          )}
          {isPartial && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle size={12} className="text-amber-600" />
              Partially Grounded in Notes
            </span>
          )}
          <span className="text-xs font-medium text-slate-600">
            {citations.length} {citations.length === 1 ? 'course note source' : 'course note sources'} cited
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
          <span>{isOpen ? 'Hide excerpts' : 'View excerpts'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Collapsible Citation Details */}
      {isOpen && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 flex flex-col gap-2.5 bg-slate-50/40">
          {citations.map((c, idx) => (
            <div
              key={c.doc_id ? `${c.doc_id}_${idx}` : idx}
              className="p-3 bg-white border border-slate-200/80 rounded-xl text-xs space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <FileText size={13} className="text-blue-600 shrink-0" />
                  <span>{c.document_title}</span>
                  {c.page && (
                    <span className="text-[11px] text-slate-500 font-normal">
                      (Page {c.page})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                      c.scope === 'official'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/70'
                        : 'bg-purple-50 text-purple-700 border border-purple-200/70'
                    }`}
                  >
                      {c.scope === 'official' ? 'Official Corpus' : 'Student Note'}
                  </span>
                  {c.score !== undefined && c.score !== null && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {Math.round(c.score * 100)}% match
                    </span>
                  )}
                </div>
              </div>

              {/* Excerpt quote */}
              <div className="relative pl-3 border-l-2 border-blue-400 text-slate-600 text-[11px] leading-relaxed italic bg-slate-50/70 py-1.5 pr-2 rounded-r">
                <Quote size={10} className="inline text-blue-400 mr-1 not-italic -mt-1" />
                {c.excerpt}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

