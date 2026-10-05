import { Zap } from 'lucide-react';

// "gemini-3.8-flash" -> "Gemini 3.8 Flash", "gemini-3.5-flash-lite" -> "Gemini 3.5 Flash Lite"
const prettyModelName = (id) =>
  String(id)
    .split('-')
    .map((part) => (/^\d/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');

// Shown under a tutor answer when the main model was overloaded (503) and the
// lite model answered that one response instead.
export default function FallbackNotice({ model, primaryModel }) {
  return (
    <div
      role="status"
      className="mt-2 inline-flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800"
    >
      <Zap size={14} className="mt-0.5 shrink-0 text-amber-600" />
      <span>
        Answered by the lite model{model ? ` (${prettyModelName(model)})` : ''} due to high load
        {primaryModel ? ` on ${prettyModelName(primaryModel)}` : ''}.
      </span>
    </div>
  );
}
