import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

function CodeBlock({ node, inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative rounded-xl overflow-hidden my-6 border border-gray-700 bg-[#1e1e1e] group shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 text-gray-300 text-xs font-mono border-b border-gray-700">
          <span>{match[1]}</span>
          <button 
            onClick={handleCopy} 
            className="flex items-center gap-1.5 hover:text-white transition-colors p-1"
            title="Copy code"
          >
            {copied ? (
              <><Check size={14} className="text-green-400" /> <span className="text-green-400">Copied</span></>
            ) : (
              <><Copy size={14} /> <span>Copy</span></>
            )}
          </button>
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1.25rem', background: 'transparent', fontSize: '0.9rem', lineHeight: '1.5' }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }
  return (
    <code {...props} className="bg-gray-100 text-blue-800 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono font-medium whitespace-pre-wrap break-words">
      {children}
    </code>
  );
}

export default function MarkdownRenderer({ content }) {
  return (
    <div className="prose prose-blue max-w-none text-gray-800 prose-p:leading-relaxed prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
