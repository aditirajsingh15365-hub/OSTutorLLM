import { Brain } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-6 animate-in fade-in duration-300">
      <div className="flex items-start gap-3 md:gap-4 max-w-[85%] md:max-w-[75%]">
        
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20 text-white mt-0.5">
          <Brain size={18} className="animate-pulse" />
        </div>
        
        <div className="bg-white/95 border border-slate-200/90 px-4 py-3.5 md:px-5 md:py-4 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-3.5 text-slate-600">
          <div className="flex gap-1.5 items-center py-1">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDuration: '0.9s' }}></span>
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDuration: '0.9s', animationDelay: '0.15s' }}></span>
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDuration: '0.9s', animationDelay: '0.3s' }}></span>
          </div>
          <span className="text-xs md:text-sm font-medium text-slate-700 select-none">
            OS Tutor is formulating explanation...
          </span>
        </div>
      </div>
    </div>
  );
}

