import { useState, useEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { sendChatMessage, checkHealth } from './services/api';

// Components
import ChatMessage from './components/chat/ChatMessage';
import ChatInput from './components/chat/ChatInput';
import EmptyState from './components/chat/EmptyState';
import TypingIndicator from './components/chat/TypingIndicator';
import LearningModeSelector from './components/learning/LearningModeSelector';

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
  // The tutor question the student is currently answering (set by clicking a follow-up card).
  const [pendingFollowUp, setPendingFollowUp] = useState(null);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
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
    checkHealth().catch(() => {});
  }, []);

  const handleSend = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history = buildHistory(messages);
    const previousFollowUp = pendingFollowUp;
    const userMessage = { role: 'user', content: text };

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
        fallback_used: data.fallback_used,
        model_used: data.model_used,
        primary_model: data.primary_model,
      };
      setMessages((prev) => [...prev, tutorMessage]);
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

  // Only the latest tutor message's follow-up question can be answered, because that is
  // the question the backend sees at the end of the history.
  const latestTutorIndex = messages.findLastIndex((m) => m.role === 'tutor');

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fb] font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 p-3 px-4 md:px-6 flex justify-between items-center z-20 shadow-sm shrink-0 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <BookOpen size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">OSTutorLLM</h1>
        </div>
        
        <LearningModeSelector mode={mode} setMode={setMode} />
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto w-full flex flex-col relative scroll-smooth">
        <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col">
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
    </div>
  );
}

export default App;
