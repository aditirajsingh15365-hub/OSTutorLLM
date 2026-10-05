import { BrainCircuit, ArrowRight } from 'lucide-react';

// `onClick` is only provided for the latest tutor message. Older follow-up
// questions are shown as plain, non-interactive cards.
export default function FollowUpCard({ question, onClick }) {
  if (!question) return null;
  const interactive = typeof onClick === 'function';

  return (
    <div
      onClick={interactive ? () => onClick(question) : undefined}
      className={`mt-6 p-4 md:p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 text-gray-800 shadow-sm transition-all group ${
        interactive ? 'cursor-pointer hover:shadow-md hover:border-amber-300' : 'opacity-70'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-amber-800 flex items-center gap-2">
          <BrainCircuit size={20} className="text-amber-600" />
          Check your understanding
        </h4>
        {interactive && (
          <ArrowRight size={18} className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300" />
        )}
      </div>
      <p className={`text-[15px] md:text-base leading-relaxed text-amber-950 font-medium ${interactive ? 'mb-3' : ''}`}>{question}</p>
      {interactive && (
        <div className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-200/50 px-2.5 py-1 rounded-md uppercase tracking-wide group-hover:bg-amber-200 transition-colors">
          Answer this question &rarr;
        </div>
      )}
    </div>
  );
}
