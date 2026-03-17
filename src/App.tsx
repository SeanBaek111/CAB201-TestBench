import { useState, useEffect, useCallback, useRef } from 'react';
import type { Problem, TestCase, BatchResult, Settings } from './types';
import Sidebar from './components/Sidebar';
import FileViewer from './components/FileViewer';
import DiffViewer from './components/DiffViewer';
import BatchPanel from './components/BatchPanel';
import SettingsModal from './components/SettingsModal';

const DEFAULT_TUTORIAL_PATH = '';

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem('cab201-settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { tutorialPath: DEFAULT_TUTORIAL_PATH, projectPath: '', darkMode: true };
}

type FilterType = 'all' | 'valid' | 'invalid' | 'boundary' | 'normal';

function getFilteredCases(problem: Problem, filter: FilterType): TestCase[] {
  if (filter === 'all') return problem.testCases;
  if (filter === 'valid') return problem.testCases.filter(tc => tc.validity === 'valid');
  if (filter === 'invalid') return problem.testCases.filter(tc => tc.validity === 'invalid');
  if (filter === 'boundary') return problem.testCases.filter(tc => tc.category === 'boundary');
  if (filter === 'normal') return problem.testCases.filter(tc => tc.category === 'normal');
  return problem.testCases;
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [inputContent, setInputContent] = useState('');
  const [refOutputContent, setRefOutputContent] = useState('');
  const [actualOutput, setActualOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const stateRef = useRef({ selectedProblem, selectedCase, problems, filter });
  stateRef.current = { selectedProblem, selectedCase, problems, filter };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
    localStorage.setItem('cab201-settings', JSON.stringify(settings));
  }, [settings]);

  const scanFolder = useCallback(async (path: string) => {
    if (!path) return;
    setError('');
    try {
      const res = await fetch(`/api/scan?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProblems(data.problems);
      setSelectedProblem(null);
      setSelectedCase(null);
      setBatchResults(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProblems([]);
    }
  }, []);

  useEffect(() => {
    if (settings.tutorialPath) scanFolder(settings.tutorialPath);
  }, [settings.tutorialPath, scanFolder]);

  const selectCase = useCallback(async (problem: Problem, tc: TestCase) => {
    setSelectedCase(tc);
    setActualOutput(null);
    setBatchResults(null);
    try {
      const res = await fetch(
        `/api/testcase?problemPath=${encodeURIComponent(problem.path)}&inputFile=${encodeURIComponent(tc.inputFile)}&refOutputFile=${encodeURIComponent(tc.refOutputFile)}${problem.inputsDir ? `&inputsDir=${encodeURIComponent(problem.inputsDir)}` : ''}${problem.refOutputsDir ? `&refOutputsDir=${encodeURIComponent(problem.refOutputsDir)}` : ''}`
      );
      const data = await res.json();
      setInputContent(data.input);
      setRefOutputContent(data.refOutput);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const runSingle = async () => {
    if (!settings.projectPath || !selectedCase) return;
    setRunning(true);
    setActualOutput(null);
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: settings.projectPath, inputContent }),
      });
      const data = await res.json();
      setActualOutput(data.stdout ?? data.error ?? 'No output');
    } catch (err: unknown) {
      setActualOutput(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setRunning(false);
  };

  const runBatch = async () => {
    if (!settings.projectPath || !selectedProblem) return;
    setBatchRunning(true);
    setBatchResults(null);
    setSelectedCase(null);
    try {
      const res = await fetch('/api/batch-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: settings.projectPath,
          problemPath: selectedProblem.path,
          inputsDir: selectedProblem.inputsDir,
          refOutputsDir: selectedProblem.refOutputsDir,
          testCases: selectedProblem.testCases,
        }),
      });
      const data = await res.json();
      setBatchResults(data.results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    setBatchRunning(false);
  };

  const selectProblem = (p: Problem) => {
    setSelectedProblem(p);
    setSelectedCase(null);
    setActualOutput(null);
    setBatchResults(null);
    setInputContent('');
    setRefOutputContent('');
    setFilter('all');
  };

  // Keyboard navigation with useRef to avoid stale closures
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const { selectedProblem: sp, selectedCase: sc, filter: f } = stateRef.current;
      if (!sp) return;
      const cases = getFilteredCases(sp, f);
      if (!cases.length) return;
      const idx = sc ? cases.findIndex(c => c.name === sc.name) : -1;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const next = Math.min(idx + 1, cases.length - 1);
        selectCase(sp, cases[next]);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prev = Math.max(idx - 1, 0);
        selectCase(sp, cases[prev]);
      } else if (e.key === 'Escape') {
        if (sc) {
          setSelectedCase(null);
          setActualOutput(null);
        } else {
          setSelectedProblem(null);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectCase]);

  const filteredCases = selectedProblem ? getFilteredCases(selectedProblem, filter) : [];

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h1 className="text-lg font-bold tracking-tight">CAB201 TestBench</h1>
        <div className="flex items-center gap-2">
          {settings.projectPath && selectedProblem && (
            <button
              onClick={runBatch}
              disabled={batchRunning}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {batchRunning ? 'Running...' : 'Batch Run'}
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Settings
          </button>
        </div>
      </header>

      {error && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          problems={problems}
          selectedProblem={selectedProblem}
          selectedCase={selectedCase}
          filter={filter}
          onSelectProblem={selectProblem}
          onSelectCase={(tc) => selectedProblem && selectCase(selectedProblem, tc)}
        />

        {/* Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!selectedProblem ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
              {problems.length === 0
                ? 'Open Settings to set Tutorial folder path'
                : 'Select a problem from the sidebar'}
            </div>
          ) : batchResults ? (
            <BatchPanel
              results={batchResults}
              onSelectResult={(r) => {
                const tc = selectedProblem.testCases.find(t => t.name === r.name);
                if (tc) {
                  selectCase(selectedProblem, tc);
                  setActualOutput(r.actualOutput);
                }
              }}
            />
          ) : selectedCase ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
                <span className="text-sm font-medium truncate">{selectedCase.name}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  selectedCase.validity === 'valid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                  selectedCase.validity === 'invalid' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {selectedCase.validity}
                </span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  selectedCase.category === 'boundary' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                  selectedCase.category === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {selectedCase.category}
                </span>
                <div className="flex-1" />
                {settings.projectPath && (
                  <button
                    onClick={runSingle}
                    disabled={running}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {running ? 'Running...' : 'Run'}
                  </button>
                )}
              </div>

              {/* Panels */}
              <div className="flex-1 flex overflow-hidden">
                <FileViewer title="Input" content={inputContent} />
                {actualOutput !== null ? (
                  <DiffViewer expected={refOutputContent} actual={actualOutput} />
                ) : (
                  <FileViewer title="Expected Output" content={refOutputContent} />
                )}
              </div>
            </div>
          ) : (
            /* Problem overview with filter bar and grid cards */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Filter bar */}
              <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
                {(['all', 'valid', 'invalid', 'boundary', 'normal'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 text-xs rounded ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <span className="ml-auto text-xs text-gray-400">
                  {filteredCases.length} / {selectedProblem.testCases.length} cases
                </span>
              </div>

              {/* Grid cards */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredCases.map((tc) => (
                    <button
                      key={tc.name}
                      onClick={() => selectCase(selectedProblem, tc)}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-left text-sm transition-colors hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                          tc.validity === 'valid' ? 'bg-green-500' :
                          tc.validity === 'invalid' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium truncate flex-1">{tc.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                          tc.validity === 'valid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                          tc.validity === 'invalid' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {tc.validity}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                          tc.category === 'boundary' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                          tc.category === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {tc.category}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={(s) => { setSettings(s); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
