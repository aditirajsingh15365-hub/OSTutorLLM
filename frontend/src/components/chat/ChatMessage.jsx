import { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import FollowUpCard from './FollowUpCard';
import SuggestionCard from './SuggestionCard';
import FallbackNotice from './FallbackNotice';
import { User, Brain, AlertTriangle, Copy, Check, Sparkles, BookOpen, Lightbulb, HelpCircle, Layers } from 'lucide-react';

export default function ChatMessage({ msg, onSuggestionClick, onFollowUpClick }) {
  const isUser = msg.role === 'user';
  const isError = msg.role === 'error';
  const isLatestTutor = typeof onFollowUpClick === 'function';
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  const handleCopyAnswer = () => {
    if (!msg.content) return;
    navigator.clipboard.writeText(msg.content);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  if (isError) {
    return (
      <div className="flex justify-center my-6 animate-in fade-in duration-300">
        <div className="bg-rose-50/90 border border-rose-200 text-rose-900 px-5 py-4 rounded-2xl flex items-start gap-3.5 shadow-xs max-w-2xl w-full">
          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 shrink-0 mt-0.5">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-rose-900 text-sm">Connection or Server Issue</div>
            <p className="text-xs md:text-sm text-rose-800 mt-0.5 leading-relaxed">{msg.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-8 group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex items-start gap-3 md:gap-4 max-w-[96%] md:max-w-[88%] lg:max-w-[82%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs transition-transform group-hover:scale-105 ${
          isUser 
            ? 'bg-gradient-to-br from-slate-700 to-slate-900 text-white border border-slate-600' 
            : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-500/20'
        }`}>
          {isUser ? <User size={18} /> : <Brain size={19} />}
        </div>

        {/* Message Content Container */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
          
          {/* Header metadata row for Tutor */}
          {!isUser && (
            <div className="mb-2 flex items-center flex-wrap gap-2 text-xs">
              <span className="font-bold text-slate-800 text-[13px] tracking-tight flex items-center gap-1.5">
                OS Tutor
              </span>

              {msg.topic && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50/90 rounded-md border border-blue-200/70 shadow-2xs">
                  <Layers size={11} className="text-blue-500" />
                  <span>{msg.topic}</span>
                </div>
              )}

              {msg.mode && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 rounded-md border border-slate-200/60">
                  <span>{msg.mode}</span>
                </div>
              )}

              {msg.timestamp && (
                <span className="text-[11px] text-slate-400 font-mono ml-auto">
                  {msg.timestamp}
                </span>
              )}
            </div>
          )}

          {/* User metadata row */}
          {isUser && msg.timestamp && (
            <div className="mb-1 text-[11px] text-slate-400 font-mono pr-1">
              {msg.timestamp}
            </div>
          )}

          {/* Bubble */}
          <div className={`relative p-4 md:p-6 rounded-3xl transition-all ${
            isUser 
              ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-xs shadow-md shadow-blue-600/10' 
              : 'bg-white border border-slate-200/90 rounded-tl-xs shadow-xs w-full hover:border-slate-300'
          }`}>
            
            {/* Top Right Copy Button for Tutor Answers */}
            {!isUser && (
              <div className="absolute top-3.5 right-3.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyAnswer}
                  title="Copy full explanation"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/90 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                >
                  {copiedAnswer ? (
                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold px-1">
                      <Check size={13} />
                      <span className="text-[11px]">Copied</span>
                    </div>
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>
            )}

            {isUser ? (
              <div className="text-[15px] md:text-base leading-relaxed whitespace-pre-wrap break-words font-normal">
                {msg.content}
              </div>
            ) : (
              <div className="pr-6">
                <MarkdownRenderer content={msg.content} />
              </div>
            )}
          </div>
          
          {/* Shown when the lite model answered because the main model was overloaded */}
          {!isUser && msg.fallback_used && (
            <FallbackNotice model={msg.model_used} primaryModel={msg.primary_model} />
          )}

          {/* Follow-up question & Next topic cards */}
          {!isUser && (
            <div className="w-full flex flex-col gap-1 mt-1 pl-0.5">
              <FollowUpCard question={msg.follow_up} onClick={onFollowUpClick} />
              <SuggestionCard suggestion={msg.suggestion} onClick={onSuggestionClick} />
            </div>
          )}

          {/* Pedagogical quick-action prompts for active/latest tutor response */}
          {!isUser && isLatestTutor && onSuggestionClick && (
            <div className="mt-3 flex items-center flex-wrap gap-2 pt-1 pl-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Sparkles size={11} className="text-blue-500" />
                Drill deeper:
              </span>
              
              <button
                type="button"
                onClick={() => onSuggestionClick("Can you simplify that explanation with a real-world analogy?")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-blue-50/80 hover:text-blue-700 border border-slate-200/90 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <Lightbulb size={12} className="text-amber-500" />
                <span>Simplify with analogy</span>
              </button>

              <button
                type="button"
                onClick={() => onSuggestionClick("Give me a university exam-style practice question on this concept.")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-blue-50/80 hover:text-blue-700 border border-slate-200/90 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <HelpCircle size={12} className="text-blue-500" />
                <span>Exam practice question</span>
              </button>

              <button
                type="button"
                onClick={() => onSuggestionClick("Can you provide a step-by-step numerical example for this?")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-blue-50/80 hover:text-blue-700 border border-slate-200/90 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <BookOpen size={12} className="text-emerald-500" />
                <span>Step-by-step example</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

