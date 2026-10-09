import { useState } from 'react';
import { 
  TerminalSquare, 
  Cpu, 
  Database, 
  GraduationCap, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  BookMarked,
  ShieldAlert,
  GitBranch
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'CPU & Scheduling',
  'Memory & Paging',
  'Processes & Sync',
  'Deadlocks & Storage',
  'Exam & Viva'
];

const PROMPTS = [
  { 
    category: 'Processes & Sync',
    topic: 'Processes',
    title: 'Process vs Program',
    text: 'Explain the difference between a program, process, and thread, including PCB structure and state transitions.',
    icon: TerminalSquare,
    accent: 'text-sky-600 bg-sky-50 border-sky-200'
  },
  { 
    category: 'CPU & Scheduling',
    topic: 'CPU Scheduling',
    title: 'Round Robin Scheduling',
    text: 'Explain Round Robin CPU scheduling with a Gantt chart example, turnaround time, and waiting time formulas.',
    icon: Cpu,
    accent: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  { 
    category: 'Memory & Paging',
    topic: 'Memory Management',
    title: 'Paging vs Segmentation',
    text: 'Give a 5-mark exam-ready comparison between paging and segmentation with internal vs external fragmentation.',
    icon: Database,
    accent: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  { 
    category: 'Deadlocks & Storage',
    topic: 'Deadlocks',
    title: "Banker's Algorithm & Safe State",
    text: "How does Banker's Algorithm ensure deadlock avoidance? Walk me through a safe sequence calculation.",
    icon: ShieldAlert,
    accent: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  { 
    category: 'Processes & Sync',
    topic: 'Process Synchronization',
    title: 'Semaphores & Critical Section',
    text: 'Explain the Critical Section problem and how binary and counting semaphores solve race conditions.',
    icon: GitBranch,
    accent: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  { 
    category: 'Exam & Viva',
    topic: 'Virtual Memory',
    title: 'Viva Voce: Demand Paging & TLB',
    text: 'Conduct a rapid viva session asking me 3 oral exam questions on TLB hits, page faults, and LRU replacement.',
    icon: GraduationCap,
    accent: 'text-rose-600 bg-rose-50 border-rose-200'
  }
];

export default function EmptyState({ onPromptClick }) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredPrompts = selectedCategory === 'All'
    ? PROMPTS
    : PROMPTS.filter((p) => p.category === selectedCategory);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80%] max-w-4xl mx-auto px-2 py-8 md:py-12 animate-in fade-in duration-500">
      
      {/* Hero Icon */}
      <div className="relative mb-5">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/25 border border-white/80 transition-transform hover:scale-105">
          <Cpu size={36} className="text-white drop-shadow-sm" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-xs">
          <Sparkles size={12} />
        </div>
      </div>
      
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full text-xs font-semibold bg-blue-50/90 text-blue-700 border border-blue-200/70 shadow-2xs select-none">
        <BookMarked size={12} className="text-blue-600" />
        <span>Academic Operating Systems AI Tutor</span>
      </div>

      {/* Main Title & Subtitle */}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight text-center">
        Learn Operating Systems Step by Step
      </h2>
      
      <p className="text-slate-600 text-center mb-8 max-w-2xl text-sm md:text-base leading-relaxed">
        Personalized university-level tutor designed for conceptual mastery, algorithm practice, 5/10-mark exam formats, and interactive viva voce.
      </p>

      {/* Category Pills Filter */}
      <div className="w-full flex items-center justify-center flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map((cat) => {
          const isActive = cat === selectedCategory;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white/90 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Starter Prompts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full mb-10">
        {filteredPrompts.map((prompt, i) => {
          const Icon = prompt.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPromptClick(prompt.text)}
              className="flex flex-col text-left p-4 bg-white/90 backdrop-blur-xs border border-slate-200/90 rounded-2xl hover:border-blue-400/90 hover:shadow-md hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className={`p-2 rounded-xl border flex items-center justify-center ${prompt.accent}`}>
                  <Icon size={16} />
                </div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                  {prompt.topic}
                </span>
              </div>

              <div className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors mb-1">
                {prompt.title}
              </div>

              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1">
                {prompt.text}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold opacity-80 group-hover:opacity-100">
                <span>Ask tutor</span>
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Pedagogical Feature Badges */}
      <div className="w-full pt-4 border-t border-slate-200/70 grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-1.5 py-1">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <span>Understanding Checks</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-1">
          <CheckCircle2 size={13} className="text-blue-500" />
          <span>Exam Structured Answers</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-1">
          <CheckCircle2 size={13} className="text-indigo-500" />
          <span>Curriculum Topic Flow</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-1">
          <CheckCircle2 size={13} className="text-purple-500" />
          <span>Multi-Mode Teaching</span>
        </div>
      </div>

    </div>
  );
}

