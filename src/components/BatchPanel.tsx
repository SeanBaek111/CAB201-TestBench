import { useState } from 'react';
import type { BatchResult } from '../types';

interface Props {
  results: BatchResult[];
  onSelectResult: (r: BatchResult) => void;
}

export default function BatchPanel({ results, onSelectResult }: Props) {
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail'>('all');

  const passCount = results.filter(r => r.passed).length;
  const failCount = results.length - passCount;

  const filtered = results.filter(r => {
    if (filter === 'pass') return r.passed;
    if (filter === 'fail') return !r.passed;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Summary bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="text-sm font-medium">
          Results: <span className="text-green-600 dark:text-green-400">{passCount} passed</span>
          {' / '}
          <span className="text-red-600 dark:text-red-400">{failCount} failed</span>
          {' / '}
          {results.length} total
        </div>
        <div className="flex gap-1 ml-auto">
          {(['all', 'pass', 'fail'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {f === 'all' ? 'All' : f === 'pass' ? 'Passed' : 'Failed'}
            </button>
          ))}
        </div>
      </div>

      {/* Results grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map((r) => (
            <button
              key={r.name}
              onClick={() => onSelectResult(r)}
              className={`p-3 rounded-lg border text-left text-sm transition-colors hover:shadow-md ${
                r.passed
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                  : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{r.passed ? '\u2705' : '\u274C'}</span>
                <span className="font-medium truncate">{r.name}</span>
              </div>
              {r.error && (
                <div className="text-xs text-red-600 dark:text-red-400 truncate">{r.error}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
