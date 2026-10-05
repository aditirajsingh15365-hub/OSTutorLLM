import { useState, useRef, useEffect } from 'react';
import { ChevronDown, BookOpen, Brain, Zap, Target, Code, FileText, GraduationCap } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const modes = [
  { id: 'beginner', label: 'Beginner', icon: Brain, desc: 'Simple explanations' },
  { id: 'detailed', label: 'Detailed', icon: BookOpen, desc: 'In-depth coverage' },
  { id: 'exam_5', label: 'Exam 5-mark', icon: Target, desc: 'Concise structured answer' },
  { id: 'exam_10', label: 'Exam 10-mark', icon: FileText, desc: 'Comprehensive essay style' },
  { id: 'viva', label: 'Viva', icon: GraduationCap, desc: 'Interactive Q&A' },
  { id: 'example', label: 'Example-Based', icon: Zap, desc: 'Focus on analogies' },
  { id: 'code', label: 'Code/Practical', icon: Code, desc: 'Implementation focus' }
];

export default function LearningModeSelector({ mode, setMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeMode = modes.find(m => m.id === mode) || modes[0];
  const ActiveIcon = activeMode.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <ActiveIcon size={18} className="text-blue-600 hidden sm:block" />
        <span className="font-medium text-gray-700 text-sm md:text-base">{activeMode.label}</span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 pt-1">Learning Mode</div>
            {modes.map((m) => {
              const Icon = m.icon;
              const isActive = m.id === mode;
              return (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); setIsOpen(false); }}
                  className={twMerge(
                    "w-full text-left flex items-start gap-3 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                    isActive ? "bg-blue-50" : "hover:bg-gray-50"
                  )}
                >
                  <Icon size={18} className={isActive ? "text-blue-600 mt-0.5" : "text-gray-400 mt-0.5"} />
                  <div>
                    <div className={isActive ? "text-blue-700 font-medium text-sm" : "text-gray-700 font-medium text-sm"}>{m.label}</div>
                    <div className="text-xs text-gray-500">{m.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
