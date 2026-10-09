import { HelpCircle, ArrowRight, Sparkles } from 'lucide-react';

// `onClick` is only provided for the latest tutor message. Older follow-up
// questions are shown as plain, non-interactive cards.
export default function FollowUpCard({ question, onClick }) {
  if (!question) return null;
  const interactive = typeof onClick === 'function';

  return (
    <div
      onClick={interactive ? () => onClick(question) : undefined}
      className={`mt-4 p-4 md:p-5 rounded-2xl border transition-all duration-200 group ${
        interactive
          ? 'bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/30 border-amber-300/80 shadow-xs hover:shadow-md hover:border-amber-400 hover:-translate-y-0.5 cursor-pointer'
          : 'bg-slate-50/80 border-slate-200 text-slate-600 opacity-80'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border flex items-center justify-center ${
            interactive 
              ? 'bg-amber-100/80 text-amber-700 border-amber-200' 
              : 'bg-slate-200/60 text-slate-500 border-slate-300/50'
          }`}>
            <HelpCircle size={16} />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider ${
            interactive ? 'text-amber-800' : 'text-slate-500'
          }`}>
            Check Your Understanding
          </span>
        </div>

        {interactive && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200/70">
            <Sparkles size={11} className="text-amber-600" />
            Tutor Prompt
          </span>
        )}
      </div>

      <p className={`text-[14px] md:text-[15px] leading-relaxed font-medium ${
        interactive ? 'text-amber-950' : 'text-slate-700'
      }`}>
        {question}
      </p>

      {interactive && (
        <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-amber-200/50">
          <span className="text-xs text-amber-700/90 font-normal">
            Click here or press below to answer
          </span>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-200/70 group-hover:bg-amber-300/80 px-3 py-1.5 rounded-lg transition-colors shadow-xs">
            <span>Answer this</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

