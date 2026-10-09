import { Send, Loader2, Sparkles, HelpCircle, X, CornerDownLeft } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';

export default function ChatInput({ input, setInput, handleSend, loading, inputRef, pendingFollowUp, onClearFollowUp }) {
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !loading) {
        handleSend(e);
      }
    }
  };

  const handleClearInput = () => {
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="p-3 md:p-5 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-10 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.04)]">
      <div className="max-w-4xl mx-auto">
        
        {/* Pending Follow-up Banner */}
        {pendingFollowUp && (
          <div className="mb-2.5 flex items-start gap-2.5 rounded-2xl border border-amber-300/90 bg-gradient-to-r from-amber-50 to-orange-50/80 px-3.5 py-2.5 text-xs md:text-sm text-amber-950 shadow-xs animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="p-1 rounded-md bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <HelpCircle size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-amber-900 mr-1.5 uppercase text-[11px] tracking-wide">
                Targeting Question:
              </span>
              <span className="font-medium text-amber-950">{pendingFollowUp}</span>
            </div>
            <button
              type="button"
              onClick={onClearFollowUp}
              aria-label="Stop answering this question"
              title="Cancel answering this question"
              className="shrink-0 rounded-lg p-1 text-amber-700 hover:bg-amber-200/70 hover:text-amber-900 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Input Card */}
        <form 
          onSubmit={handleSend} 
          className="relative flex items-end gap-2 bg-slate-50/90 border border-slate-300/80 rounded-2xl p-1.5 md:p-2 shadow-xs focus-within:ring-4 focus-within:ring-blue-500/15 focus-within:border-blue-500 focus-within:bg-white transition-all"
        >
          <div className="hidden sm:flex self-end mb-2 ml-2 p-1.5 bg-blue-50 border border-blue-200/60 rounded-xl text-blue-600">
            <Sparkles size={17} />
          </div>

          <TextareaAutosize
            ref={inputRef}
            minRows={1}
            maxRows={6}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={pendingFollowUp ? 'Type your answer to the tutor...' : 'Ask your OS tutor about processes, scheduling, paging, deadlocks...'}
            disabled={loading}
            className="flex-1 resize-none bg-transparent py-2.5 px-3 focus:outline-none text-slate-800 placeholder-slate-400 text-sm md:text-base leading-relaxed disabled:opacity-50"
          />

          {/* Quick Clear Input button when text exists */}
          {input.trim().length > 0 && !loading && (
            <button
              type="button"
              onClick={handleClearInput}
              aria-label="Clear input text"
              title="Clear text"
              className="mb-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}

          {/* Send Button */}
          <button 
            type="submit"
            disabled={loading || !input.trim()}
            className="mb-0.5 mr-0.5 flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2.5 md:px-4 md:py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 font-semibold text-xs md:text-sm shadow-xs cursor-pointer"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <span className="hidden md:inline">Send</span>
                <Send size={15} />
              </>
            )}
          </button>
        </form>
        
        {/* Footer shortcuts & academic badge */}
        <div className="flex items-center justify-between mt-2.5 px-2 text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500">
              <CornerDownLeft size={10} /> Enter
            </span>
            <span className="hidden sm:inline">to send</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500">
              Shift + Enter
            </span>
            <span className="hidden sm:inline">for newline</span>
          </div>

          <span className="text-slate-400 text-right ml-auto">
            OSTutorLLM Pedagogical System
          </span>
        </div>

      </div>
    </div>
  );
}

