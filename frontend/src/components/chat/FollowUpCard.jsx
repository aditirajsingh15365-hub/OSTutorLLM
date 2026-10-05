import { BrainCircuit, ArrowRight } from 'lucide-react';

export default function FollowUpCard({ question, onClick }) {
  if (!question) return null;
  return (
    <div 
      onClick={() => onClick(question)}
      className="mt-6 p-4 md:p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 text-gray-800 shadow-sm cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-amber-800 flex items-center gap-2">
          <BrainCircuit size={20} className="text-amber-600" />
          Check your understanding
        </h4>
        <ArrowRight size={18} className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300" />
      </div>
      <p className="text-[15px] md:text-base leading-relaxed text-amber-950 font-medium mb-3">{question}</p>
      <div className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-200/50 px-2.5 py-1 rounded-md uppercase tracking-wide group-hover:bg-amber-200 transition-colors">
        Answer this question &rarr;
      </div>
    </div>
  );
}
