import { Brain } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-6 animate-in fade-in duration-300">
      <div className="flex items-start gap-3 md:gap-4 max-w-[85%] md:max-w-[75%]">
        
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 border border-blue-200 mt-1 shadow-sm">
          <Brain size={20} className="text-blue-600" />
        </div>
        
        <div className="bg-white border border-gray-100 p-4 md:p-5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-4 text-gray-500 h-[60px]">
          <div className="flex gap-1.5 items-center">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
          </div>
          <span className="text-[15px] font-medium">OS Tutor is thinking...</span>
        </div>
      </div>
    </div>
  );
}
