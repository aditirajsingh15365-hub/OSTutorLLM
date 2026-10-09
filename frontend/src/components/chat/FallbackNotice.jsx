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
      className="mt-2.5 inline-flex items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-1.5 text-xs text-amber-900 shadow-xs select-none"
    >
      <div className="p-1 rounded-md bg-amber-100/90 text-amber-700">
        <Zap size={13} className="shrink-0" />
      </div>
      <span className="leading-snug">
        Served by fallback model{model ? ` (${prettyModelName(model)})` : ''} due to server load
        {primaryModel ? ` on ${prettyModelName(primaryModel)}` : ''}.
      </span>
    </div>
  );
}

