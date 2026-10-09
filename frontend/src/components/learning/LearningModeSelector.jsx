import { useState, useRef, useEffect } from 'react';
import { ChevronDown, BookOpen, Brain, Zap, Target, Code, FileText, GraduationCap, Check } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const MODES = [
  { 
    id: 'beginner', 
    label: 'Beginner', 
    icon: Brain, 
    desc: 'Intuitive explanations with minimal jargon',
    badge: 'Concept Intro',
    accent: 'text-sky-600 bg-sky-50 border-sky-200'
  },
  { 
    id: 'detailed', 
    label: 'Detailed', 
    icon: BookOpen, 
    desc: 'Deep theoretical coverage & mechanisms',
    badge: 'Comprehensive',
    accent: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  { 
    id: 'exam_5', 
    label: 'Exam 5-mark', 
    icon: Target, 
    desc: 'Concise, high-yield bulleted points & diagrams',
    badge: '5 Marks',
    accent: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  { 
    id: 'exam_10', 
    label: 'Exam 10-mark', 
    icon: FileText, 
    desc: 'Full essay structure with definitions & nuances',
    badge: '10 Marks',
    accent: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  { 
    id: 'viva', 
    label: 'Viva Voce', 
    icon: GraduationCap, 
    desc: 'Rapid interactive oral examination questions',
    badge: 'Viva Drill',
    accent: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  { 
    id: 'example', 
    label: 'Example-Based', 
    icon: Zap, 
    desc: 'Real-world analogies & relatable scenarios',
    badge: 'Analogy',
    accent: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  { 
    id: 'code', 
    label: 'Code / Practical', 
    icon: Code, 
    desc: 'C / POSIX syscalls, fork, mutexes & code',
    badge: 'Hands-on',
    accent: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  }
];

export default function LearningModeSelector({ mode, setMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeMode = MODES.find((m) => m.id === mode) || MODES[0];
  const ActiveIcon = activeMode.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={twMerge(
          "flex items-center gap-2.5 px-3 py-1.5 md:px-3.5 md:py-2 bg-white/90 backdrop-blur border rounded-xl shadow-xs transition-all cursor-pointer select-none",
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
            : "border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80"
        )}
      >
        <div className={twMerge("p-1 rounded-lg border flex items-center justify-center", activeMode.accent)}>
          <ActiveIcon size={15} />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none hidden sm:block">
            Pedagogical Mode
          </span>
          <span className="font-semibold text-slate-800 text-xs md:text-sm tracking-tight leading-snug">
            {activeMode.label}
          </span>
        </div>
        <ChevronDown 
          size={14} 
          className={twMerge("text-slate-400 ml-1 transition-transform duration-200", isOpen && "rotate-180 text-blue-600")} 
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tutor Response Mode
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Adapts explanation depth, structure, and follow-ups.
            </p>
          </div>

          <div className="p-1.5 max-h-[380px] overflow-y-auto">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isActive = m.id === mode;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id);
                    setIsOpen(false);
                  }}
                  className={twMerge(
                    "w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-all group cursor-pointer",
                    isActive
                      ? "bg-blue-50/80 border border-blue-200/70 text-blue-950"
                      : "hover:bg-slate-50 border border-transparent text-slate-700"
                  )}
                >
                  <div
                    className={twMerge(
                      "p-1.5 rounded-lg border mt-0.5 flex-shrink-0 transition-colors",
                      m.accent
                    )}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={twMerge("font-semibold text-xs md:text-sm", isActive ? "text-blue-900" : "text-slate-800")}>
                        {m.label}
                      </span>
                      {isActive ? (
                        <Check size={14} className="text-blue-600 shrink-0" />
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium text-slate-500 bg-slate-100/80 border border-slate-200/50">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                      {m.desc}
                    </div>
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

