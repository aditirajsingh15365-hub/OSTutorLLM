import { useState, useEffect, useRef } from 'react';
import { BookOpen, Cpu, RotateCcw } from 'lucide-react';
import { sendChatMessage, checkHealth } from './services/api';

// Components
import ChatMessage from './components/chat/ChatMessage';
import ChatInput from './components/chat/ChatInput';
import EmptyState from './components/chat/EmptyState';
import TypingIndicator from './components/chat/TypingIndicator';
import LearningModeSelector from './components/learning/LearningModeSelector';
import CurriculumTopicsModal from './components/learning/CurriculumTopicsModal';

// The backend needs the earlier turns so the tutor can remember what it asked.
// Tutor turns carry their follow-up question so the model knows what the
// student's next message is answering. Error bubbles are UI-only and never sent.
const buildHistory = (messages) =>
  messages
    .filter((m) => m.role === 'user' || m.role === 'tutor')
    .map((m) =>
      m.role === 'user'
        ? { role: 'user', content: m.content }
        : { role: 'tutor', content: m.content, follow_up_question: m.follow_up || null }
    );

const errorText = (error) => {
  if (!error.response) {
    return 'Could not reach the tutor server. If it was idle it may still be waking up, so please try again in a moment.';
  }
  const detail = error.response.data?.detail;
  return typeof detail === 'string'
    ? detail
    : 'Something went wrong while contacting your OS tutor. Please try again.';
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('connecting'); // 'connecting' | 'online' | 'sleeping' | 'mock'
  const [isTopicsOpen, setIsTopicsOpen] = useState(false);
  // The tutor question the student is currently answering (set by clicking a follow-up card).
  const [pendingFollowUp, setPendingFollowUp] = useState(null);
  const [sessionId, setSessionId] = useState(() => Math.random().toString(36).substring(7));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Wake the backend as soon as the page opens. A sleeping Render instance takes a
  // while to start, so by the time the student sends a first message it is ready.
  useEffect(() => {
    checkHealth()
      .then((res) => {
        if (res?.mock_mode) {
          setServerStatus('mock');
        } else {
          setServerStatus('online');
        }
      })
      .catch(() => {
        setServerStatus('sleeping');
      });
  }, []);

  const handleSend = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history = buildHistory(messages);
    const previousFollowUp = pendingFollowUp;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage = { role: 'user', content: text, timestamp: nowTime };

    // Drop any previous error bubble, then show the student's message.
    setMessages((prev) => [...prev.filter((m) => m.role !== 'error'), userMessage]);
    setInput('');
    setPendingFollowUp(null);
    setLoading(true);

    try {
      const data = await sendChatMessage(sessionId, text, mode, history);
      const tutorMessage = {
        role: 'tutor',
        content: data.answer,
        follow_up: data.follow_up_question,
        suggestion: data.suggestion,
        topic: data.topic,
        mode: data.mode || mode,
        fallback_used: data.fallback_used,
        model_used: data.model_used,
        primary_model: data.primary_model,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, tutorMessage]);
      setServerStatus('online');
    } catch (error) {
      console.error('API Error:', error);
      // The message never got an answer: remove it from the chat and put the text
      // back in the input, so retrying doesn't leave a duplicate in the history.
      setMessages((prev) => [
        ...prev.filter((m) => m !== userMessage),
        { role: 'error', content: errorText(error) },
      ]);
      setInput(text);
      setPendingFollowUp(previousFollowUp);
    } finally {
      setLoading(false);
    }
  };

  // Clicking a suggestion or starter prompt fills the input so the student can edit it first.
  const handlePromptClick = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  // Clicking "Check your understanding" does NOT copy the question into the input.
  // It shows the question as context above the input and waits for the student's answer.
  const handleFollowUpClick = (question) => {
    setPendingFollowUp(question);
    inputRef.current?.focus();
  };

  // Reset conversation to fresh state with a new session ID
  const handleNewSession = () => {
    if (messages.length > 0 && !window.confirm('Start a new session? This will clear the current conversation.')) {
      return;
    }
    setMessages([]);
    setInput('');
    setPendingFollowUp(null);
    setSessionId(Math.random().toString(36).substring(7));
  };

  // Only the latest tutor message's follow-up question can be answered, because that is
  // the question the backend sees at the end of the history.
  const latestTutorIndex = messages.findLastIndex((m) => m.role === 'tutor');

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/90 px-3 py-2.5 sm:px-6 flex justify-between items-center z-20 shadow-2xs shrink-0 sticky top-0">
        
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20 text-white flex-shrink-0">
            <Cpu size={19} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">
                OSTutorLLM
              </h1>
              
              {/* Server Status Pill */}
              <div 
                title={
                  serverStatus === 'online' 
                    ? 'Backend connected and active' 
                    : serverStatus === 'mock' 
                    ? 'Running with local mock responses' 
                    : serverStatus === 'sleeping' 
                    ? 'Backend is waking up (Render free tier)' 
                    : 'Connecting to backend...'
                }
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 border border-slate-200/80 text-slate-600 select-none"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  serverStatus === 'online' 
                    ? 'bg-emerald-500 shadow-xs shadow-emerald-400' 
                    : serverStatus === 'mock' 
                    ? 'bg-blue-500' 
                    : 'bg-amber-500 animate-ping'
                }`} />
                <span>
                  {serverStatus === 'online' ? 'Live' : serverStatus === 'mock' ? 'Mock' : serverStatus === 'sleeping' ? 'Waking' : 'Connecting'}
                </span>
              </div>
            </div>

            <span className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Academic Operating Systems AI Tutor
            </span>
          </div>
        </div>
        
        {/* Actions & Mode Selector */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          {/* Topics / Syllabus Button */}
          <button
            type="button"
            onClick={() => setIsTopicsOpen(true)}
            title="Browse Operating Systems Curriculum & Topics"
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
          >
            <BookOpen size={14} className="text-blue-600" />
            <span className="hidden md:inline">Syllabus</span>
          </button>

          {/* New Session Button */}
          <button
            type="button"
            onClick={handleNewSession}
            title="Start a fresh tutoring session"
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
          >
            <RotateCcw size={14} className="text-slate-500" />
            <span className="hidden md:inline">New Session</span>
          </button>

          {/* Learning Mode Selector */}
          <LearningModeSelector mode={mode} setMode={setMode} />
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto w-full flex flex-col relative scroll-smooth">
        <div className="flex-1 w-full max-w-4xl mx-auto p-3 sm:p-5 md:p-6 lg:p-8 flex flex-col">
          {messages.length === 0 ? (
            <EmptyState onPromptClick={handlePromptClick} />
          ) : (
            <div className="flex flex-col pb-4">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  msg={msg}
                  onSuggestionClick={handlePromptClick}
                  onFollowUpClick={idx === latestTutorIndex ? handleFollowUpClick : undefined}
                />
              ))}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <ChatInput 
        input={input} 
        setInput={setInput} 
        handleSend={handleSend} 
        loading={loading}
        inputRef={inputRef}
        pendingFollowUp={pendingFollowUp}
        onClearFollowUp={() => setPendingFollowUp(null)}
      />

      {/* Curriculum & Topics Explorer Modal */}
      <CurriculumTopicsModal
        isOpen={isTopicsOpen}
        onClose={() => setIsTopicsOpen(false)}
        onSelectTopic={handlePromptClick}
      />
    </div>
  );
}

export default App;

