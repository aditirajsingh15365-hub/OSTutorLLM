import { Compass, ArrowRight, BookOpen } from 'lucide-react';

export default function SuggestionCard({ suggestion, onClick }) {
  if (!suggestion) return null;
  return (
    <div 
      onClick={() => onClick(suggestion)}
      className="mt-3 p-4 md:p-5 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-emerald-100/30 rounded-2xl border border-emerald-200/90 text-slate-800 shadow-xs cursor-pointer hover:shadow-md hover:border-emerald-400 hover:-translate-y-0.5 transition-all duration-200 group select-none"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border bg-emerald-100/80 text-emerald-700 border-emerald-200 flex items-center justify-center">
            <Compass size={16} />
          </div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            Recommended Next Step
          </span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200/70">
          <BookOpen size={11} className="text-emerald-600" />
          Curriculum Flow
        </span>
      </div>

      <p className="text-[14px] md:text-[15px] leading-relaxed text-emerald-950 font-medium">
        {suggestion}
      </p>

      <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-emerald-200/50">
        <span className="text-xs text-emerald-700/90 font-normal">
          Click to load this topic into the tutor
        </span>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-200/70 group-hover:bg-emerald-300/80 px-3 py-1.5 rounded-lg transition-colors shadow-xs">
          <span>Learn this</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}

