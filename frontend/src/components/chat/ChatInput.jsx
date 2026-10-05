import { Send, Loader2, Sparkles, BrainCircuit, X } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

export default function ChatInput({ input, setInput, handleSend, loading, inputRef, pendingFollowUp, onClearFollowUp }) {
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if(input.trim() && !loading) {
        handleSend(e);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white border-t border-gray-200 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
      <div className="max-w-4xl mx-auto">
        {pendingFollowUp && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <BrainCircuit size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="flex-1 min-w-0 break-words">
              <span className="font-semibold">Answering:</span> {pendingFollowUp}
            </p>
            <button
              type="button"
              onClick={onClearFollowUp}
              aria-label="Stop answering this question"
              className="shrink-0 rounded-md p-0.5 text-amber-700 hover:bg-amber-200/60 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-2xl p-1.5 md:p-2 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          
          <div className="hidden sm:flex self-end mb-1.5 ml-2 p-1.5 bg-blue-100 rounded-lg text-blue-600">
            <Sparkles size={20} />
          </div>

          <TextareaAutosize
            ref={inputRef}
            minRows={1}
            maxRows={6}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={pendingFollowUp ? 'Type your answer...' : 'Ask your OS tutor about processes, scheduling, deadlocks...'}
            disabled={loading}
            className="flex-1 resize-none bg-transparent py-2.5 px-3 focus:outline-none text-gray-800 placeholder-gray-400 text-base leading-relaxed disabled:opacity-50"
          />
          
          <button 
            type="submit"
            disabled={loading || !input.trim()}
            className="mb-0.5 mr-0.5 flex-shrink-0 bg-blue-600 text-white p-2 md:px-4 md:py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <span className="hidden md:inline">Send</span>
                <Send size={18} className="md:ml-0.5" />
              </>
            )}
          </button>
        </form>
        
        <div className="text-center mt-3 text-[11px] md:text-xs text-gray-400 font-medium">
          Shift + Enter for new line - OSTutorLLM is an academic AI experiment
        </div>
      </div>
    </div>
  );
}
