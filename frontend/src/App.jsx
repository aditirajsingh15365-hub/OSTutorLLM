import { useState, useEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { sendChatMessage } from './services/api';

// Components
import ChatMessage from './components/chat/ChatMessage';
import ChatInput from './components/chat/ChatInput';
import EmptyState from './components/chat/EmptyState';
import TypingIndicator from './components/chat/TypingIndicator';
import LearningModeSelector from './components/learning/LearningModeSelector';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e, customText = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Remove previous error if any
    setMessages(prev => prev.filter(m => m.role !== 'error'));

    try {
      const data = await sendChatMessage(sessionId, userMessage.content, mode);
      const tutorMessage = {
        role: 'tutor',
        content: data.answer,
        follow_up: data.follow_up_question,
        suggestion: data.suggestion,
        topic: data.topic,
      };
      setMessages(prev => [...prev, tutorMessage]);
    } catch (error) {
      console.error("API Error:", error);
      setMessages(prev => [...prev, { role: 'error', content: 'Something went wrong while contacting your OS tutor. Please try again.' }]);
      setInput(textToSend); // Restore input on failure
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (text) => {
    setInput(text);
  };

  const handleStarterPrompt = (text) => {
    setInput(text);
  };

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
            <EmptyState onPromptClick={handleStarterPrompt} />
          ) : (
            <div className="flex flex-col pb-4">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} msg={msg} onSuggestionClick={handleSuggestionClick} />
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
      />
    </div>
  );
}

export default App;
