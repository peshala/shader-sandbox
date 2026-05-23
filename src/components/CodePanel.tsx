"use client";

interface Props {
  code: string;
  label: string;
}

export default function CodePanel({ code, label }: Props) {
  return (
    <div className="flex flex-col h-full bg-gray-950">
      {label && (
        <div className="px-4 py-2 text-xs font-mono text-gray-400 border-b border-gray-800 uppercase tracking-wider">
          {label}
        </div>
      )}
      <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-gray-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
