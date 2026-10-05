import { TerminalSquare, Layers, Cpu, Database } from 'lucide-react';

const prompts = [
  { text: "Explain process vs program", icon: TerminalSquare },
  { text: "Teach me deadlocks", icon: Layers },
  { text: "Give me a CPU scheduling question", icon: Cpu },
  { text: "Quiz me on memory management", icon: Database }
];

export default function EmptyState({ onPromptClick }) {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4 py-12 md:py-20 animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 border-4 border-white">
        <Cpu size={40} className="text-white" />
      </div>
      
      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">OSTutorLLM</h2>
      
      <p className="text-gray-500 text-center mb-12 max-w-lg text-lg leading-relaxed">
        Your personalized AI Operating Systems Tutor. Ask me to explain concepts, solve problems, or prepare you for exams.
      </p>
      
      <div className="w-full">
        <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 text-center">Try a starter prompt</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {prompts.map((prompt, i) => {
            const Icon = prompt.icon;
            return (
              <button
                key={i}
                onClick={() => onPromptClick(prompt.text)}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5 transition-all text-left group"
              >
                <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 text-gray-500 transition-colors">
                  <Icon size={20} />
                </div>
                <span className="text-[15px] font-medium text-gray-700 group-hover:text-gray-900">{prompt.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
