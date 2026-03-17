import { useState } from 'react';

interface Props {
  title: string;
  content: string;
}

export default function FileViewer({ title, content }: Props) {
  const lines = content.split('\n');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-800 last:border-r-0 overflow-hidden">
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 flex items-center justify-between">
        <span>{title}</span>
        <button
          onClick={handleCopy}
          className="px-2 py-0.5 text-[10px] rounded border border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-950">
        <table className="file-content w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="line-number">{i + 1}</td>
                <td className="pl-3 whitespace-pre">{line || '\u00A0'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
