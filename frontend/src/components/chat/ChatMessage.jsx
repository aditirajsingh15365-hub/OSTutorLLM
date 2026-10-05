import MarkdownRenderer from './MarkdownRenderer';
import FollowUpCard from './FollowUpCard';
import SuggestionCard from './SuggestionCard';
import FallbackNotice from './FallbackNotice';
import { User, Brain, AlertTriangle } from 'lucide-react';

export default function ChatMessage({ msg, onSuggestionClick, onFollowUpClick }) {
  const isUser = msg.role === 'user';
  const isError = msg.role === 'error';

  if (isError) {
    return (
      <div className="flex justify-center my-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-2xl flex items-center gap-3 shadow-sm max-w-2xl w-full">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
          <span className="text-[15px] font-medium">{msg.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-8 group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex items-start gap-3 md:gap-4 max-w-[95%] md:max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 border mt-1 shadow-sm ${
          isUser ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300' : 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300'
        }`}>
          {isUser ? <User size={18} className="text-gray-600" /> : <Brain size={20} className="text-blue-700" />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
          
          {/* Topic Badge */}
          {!isUser && msg.topic && (
            <div className="mb-2.5 inline-flex items-center px-3 py-1 text-[11px] font-bold tracking-wider text-blue-700 uppercase bg-blue-50 rounded-lg border border-blue-200/60 shadow-sm">
              Topic: {msg.topic}
            </div>
          )}

          {/* Bubble */}
          <div className={`p-4 md:p-6 rounded-3xl shadow-sm ${
            isUser 
              ? 'bg-blue-600 text-white rounded-tr-sm' 
              : 'bg-white border border-gray-100/80 rounded-tl-sm shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] w-full'
          }`}>
            {isUser ? (
              <div className="text-[15px] md:text-base leading-relaxed whitespace-pre-wrap break-words">
                {msg.content}
              </div>
            ) : (
              <MarkdownRenderer content={msg.content} />
            )}
          </div>
          
          {/* Shown when the lite model answered because the main model was overloaded */}
          {!isUser && msg.fallback_used && (
            <FallbackNotice model={msg.model_used} primaryModel={msg.primary_model} />
          )}

          {/* Cards outside the main bubble */}
          {!isUser && (
            <div className="w-full flex flex-col gap-1 mt-1 pl-1 md:pl-2">
              <FollowUpCard question={msg.follow_up} onClick={onFollowUpClick} />
              <SuggestionCard suggestion={msg.suggestion} onClick={onSuggestionClick} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
