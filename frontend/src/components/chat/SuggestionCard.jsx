import { BookMarked, ArrowRight } from 'lucide-react';

export default function SuggestionCard({ suggestion, onClick }) {
  if (!suggestion) return null;
  return (
    <div 
      onClick={() => onClick(suggestion)}
      className="mt-4 p-4 md:p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 text-gray-800 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-emerald-800 flex items-center gap-2">
          <BookMarked size={20} className="text-emerald-600" />
          Recommended next topic
        </h4>
        <ArrowRight size={18} className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300" />
      </div>
      <p className="text-[15px] md:text-base leading-relaxed text-emerald-950 font-medium mb-3">{suggestion}</p>
      <div className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-200/50 px-2.5 py-1 rounded-md uppercase tracking-wide group-hover:bg-emerald-200 transition-colors">
        Learn this &rarr;
      </div>
    </div>
  );
}
