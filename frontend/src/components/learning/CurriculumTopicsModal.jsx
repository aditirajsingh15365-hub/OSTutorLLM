import { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  Cpu, 
  Database, 
  Terminal, 
  Sparkles,
  ArrowRight,
  GitPullRequest
} from 'lucide-react';

const TOPIC_DOMAINS = [
  {
    domain: 'Process Management & CPU',
    icon: Cpu,
    accent: 'text-blue-600 bg-blue-50 border-blue-200',
    topics: [
      {
        name: 'Processes',
        summary: 'PCB, Process States, Fork/Exec, Context Switching, Zombie & Orphan',
        starter: 'Explain the difference between a process and program, and what happens during a context switch.'
      },
      {
        name: 'Threads & Multithreading',
        summary: 'User vs Kernel threads, POSIX pthreads, Multithreading models',
        starter: 'Compare user-level threads and kernel-level threads with pros and cons.'
      },
      {
        name: 'CPU Scheduling',
        summary: 'FCFS, SJF, SRTF, Round Robin, Multilevel Queue, Turnaround & Waiting time',
        starter: 'Explain Round Robin scheduling with a sample Gantt chart and waiting time formula.'
      },
      {
        name: 'IPC (Inter-Process Communication)',
        summary: 'Pipes, Named Pipes (FIFO), Message Queues, Shared Memory, Sockets',
        starter: 'Explain shared memory vs message passing for inter-process communication.'
      }
    ]
  },
  {
    domain: 'Concurrency & Deadlocks',
    icon: GitPullRequest,
    accent: 'text-purple-600 bg-purple-50 border-purple-200',
    topics: [
      {
        name: 'Process Synchronization',
        summary: 'Critical Section, Race Conditions, Mutex, Counting & Binary Semaphores, Peterson Algorithm',
        starter: 'Explain the Critical Section problem and how semaphores prevent race conditions.'
      },
      {
        name: 'Classical Sync Problems',
        summary: 'Producer-Consumer, Readers-Writers, Dining Philosophers',
        starter: 'Walk me through the Producer-Consumer problem and solve it using semaphores in C-like pseudocode.'
      },
      {
        name: 'Deadlocks',
        summary: "Necessary Conditions, Resource Allocation Graphs, Banker's Algorithm, Prevention & Avoidance",
        starter: "Explain the four Coffman conditions for deadlock and how Banker's algorithm detects a safe state."
      }
    ]
  },
  {
    domain: 'Memory & Storage',
    icon: Database,
    accent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    topics: [
      {
        name: 'Memory Management',
        summary: 'Paging, Page Tables, Segmentation, Internal & External Fragmentation, TLB',
        starter: 'Explain paging vs segmentation in a 5-mark structured comparison.'
      },
      {
        name: 'Virtual Memory',
        summary: 'Demand Paging, Page Faults, Page Replacement (FIFO, LRU, Optimal), Thrashing, Belady Anomaly',
        starter: 'How does a page fault work step-by-step from interrupt to page table update?'
      },
      {
        name: 'File Systems',
        summary: 'Inodes, Directory structure, FAT32 vs Ext4, File allocation methods',
        starter: 'Explain how UNIX inodes track file data blocks, single indirect, and double indirect pointers.'
      },
      {
        name: 'Disk Scheduling',
        summary: 'FCFS, SSTF, SCAN (Elevator), C-SCAN, LOOK, C-LOOK algorithms',
        starter: 'Compare SCAN and C-SCAN disk scheduling algorithms with head movement calculation.'
      }
    ]
  },
  {
    domain: 'System Architecture & Linux',
    icon: Terminal,
    accent: 'text-amber-600 bg-amber-50 border-amber-200',
    topics: [
      {
        name: 'Operating System Structure',
        summary: 'Monolithic vs Microkernel, Layered Architecture, Dual-mode CPU (User vs Kernel)',
        starter: 'Explain the difference between monolithic and microkernel architectures with real OS examples.'
      },
      {
        name: 'System Calls',
        summary: 'User/Kernel mode transitions, Syscall interface, Traps & software interrupts',
        starter: 'Explain what happens under the hood when a user program invokes read() or write() system call.'
      },
      {
        name: 'I/O Systems',
        summary: 'Polling, Interrupts, DMA (Direct Memory Access), Device Drivers, Spooling',
        starter: 'Why is DMA used instead of programmed I/O or interrupt-driven I/O for large data transfers?'
      }
    ]
  }
];

export default function CurriculumTopicsModal({ isOpen, onClose, onSelectTopic }) {
  const [search, setSearch] = useState('');

  const filteredDomains = useMemo(() => {
    if (!search.trim()) return TOPIC_DOMAINS;
    const q = search.toLowerCase();
    return TOPIC_DOMAINS.map((domain) => {
      const matchedTopics = domain.topics.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.starter.toLowerCase().includes(q)
      );
      return { ...domain, topics: matchedTopics };
    }).filter((domain) => domain.topics.length > 0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                OS Curriculum & Topic Explorer
              </h3>
              <p className="text-xs text-slate-500">
                Explore the core Operating Systems syllabus & click any topic to start tutoring
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close syllabus explorer"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:px-6 sm:py-3 border-b border-slate-100 bg-white">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search OS concepts: paging, banker's, semaphores, round robin, fork..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Topics List Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {filteredDomains.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No matching OS topics found for &ldquo;{search}&rdquo;. Try another term.
            </div>
          ) : (
            filteredDomains.map((domain, idx) => {
              const Icon = domain.icon;
              return (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border flex items-center justify-center ${domain.accent}`}>
                      <Icon size={15} />
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wide">
                      {domain.domain}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {domain.topics.map((topic, tIdx) => (
                      <button
                        key={tIdx}
                        type="button"
                        onClick={() => {
                          onSelectTopic(topic.starter);
                          onClose();
                        }}
                        className="text-left p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-xs transition-all group cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                              {topic.name}
                            </span>
                            <ArrowRight size={13} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {topic.summary}
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-blue-600 font-semibold opacity-85 group-hover:opacity-100">
                          <Sparkles size={10} />
                          <span>Click to ask tutor</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span>14 core academic OS modules aligned with course syllabus</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
