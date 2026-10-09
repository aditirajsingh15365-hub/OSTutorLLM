import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, Terminal } from 'lucide-react';
import { useState } from 'react';

function CodeBlock({ inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    const lang = match[1];
    return (
      <div className="relative rounded-2xl overflow-hidden my-5 border border-slate-700/80 bg-[#18181b] group shadow-md shadow-slate-900/10">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#202024] text-slate-300 text-xs border-b border-slate-700/60 select-none">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block"></span>
            </div>
            <Terminal size={13} className="text-slate-400" />
            <span className="font-mono text-slate-300 font-medium tracking-wide uppercase text-[11px]">{lang}</span>
          </div>
          <button 
            onClick={handleCopy} 
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer font-sans text-xs"
            title="Copy code"
            type="button"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" /> 
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} /> 
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="overflow-x-auto text-[13px] md:text-sm font-mono">
          <SyntaxHighlighter
            {...props}
            style={vscDarkPlus}
            language={lang}
            PreTag="div"
            customStyle={{ 
              margin: 0, 
              padding: '1.25rem', 
              background: 'transparent', 
              fontSize: '0.875rem', 
              lineHeight: '1.6',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
            }}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  }
  return (
    <code {...props} className="bg-slate-100 text-blue-700 border border-slate-200/60 px-1.5 py-0.5 rounded-md text-[0.88em] font-mono font-semibold whitespace-pre-wrap break-words">
      {children}
    </code>
  );
}

export default function MarkdownRenderer({ content }) {
  return (
    <div className="prose prose-slate max-w-none text-slate-800 text-[15px] md:text-base leading-relaxed prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-a:font-medium prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0 prose-strong:text-slate-900 prose-strong:font-bold">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

