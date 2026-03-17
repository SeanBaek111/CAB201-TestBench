import type { Problem, TestCase } from '../types';

type FilterType = 'all' | 'valid' | 'invalid' | 'boundary' | 'normal';

interface Props {
  problems: Problem[];
  selectedProblem: Problem | null;
  selectedCase: TestCase | null;
  filter: FilterType;
  onSelectProblem: (p: Problem) => void;
  onSelectCase: (tc: TestCase) => void;
}

function getFilteredCases(problem: Problem, filter: FilterType): TestCase[] {
  if (filter === 'all') return problem.testCases;
  if (filter === 'valid') return problem.testCases.filter(tc => tc.validity === 'valid');
  if (filter === 'invalid') return problem.testCases.filter(tc => tc.validity === 'invalid');
  if (filter === 'boundary') return problem.testCases.filter(tc => tc.category === 'boundary');
  if (filter === 'normal') return problem.testCases.filter(tc => tc.category === 'normal');
  return problem.testCases;
}

export default function Sidebar({ problems, selectedProblem, selectedCase, filter, onSelectProblem, onSelectCase }: Props) {
  return (
    <aside className="w-72 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
        Problems
      </div>
      <div className="flex-1 overflow-y-auto">
        {problems.map((p) => (
          <div key={p.name}>
            <button
              onClick={() => onSelectProblem(p)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                selectedProblem?.name === p.name ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' : ''
              }`}
            >
              <span className="mr-1">{selectedProblem?.name === p.name ? '\u25BC' : '\u25B6'}</span>
              {p.name}
              <span className="ml-1 text-xs text-gray-400">({p.testCases.length})</span>
            </button>

            {selectedProblem?.name === p.name && (
              <div className="border-b border-gray-200 dark:border-gray-800">
                {getFilteredCases(p, filter).map((tc) => (
                  <button
                    key={tc.name}
                    onClick={() => onSelectCase(tc)}
                    className={`w-full text-left pl-7 pr-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5 ${
                      selectedCase?.name === tc.name ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : ''
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                      tc.validity === 'valid' ? 'bg-green-500' :
                      tc.validity === 'invalid' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <span className="truncate">{tc.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
