import { useState } from 'react';
import type { Settings } from '../types';

interface Props {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

async function pickFolder(): Promise<string | null> {
  try {
    const res = await fetch('/api/pick-folder');
    const data = await res.json();
    return data.path || null;
  } catch {
    return null;
  }
}

export default function SettingsModal({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>({ ...settings });
  const [picking, setPicking] = useState<'tutorial' | 'project' | null>(null);

  const browse = async (field: 'tutorialPath' | 'projectPath') => {
    setPicking(field === 'tutorialPath' ? 'tutorial' : 'project');
    const path = await pickFolder();
    if (path) setDraft({ ...draft, [field]: path });
    setPicking(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tutorial Folder Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.tutorialPath}
                onChange={(e) => setDraft({ ...draft, tutorialPath: e.target.value })}
                placeholder="/path/to/Tutorial 3 - Input and Output"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                onClick={() => browse('tutorialPath')}
                disabled={picking !== null}
                className="px-3 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 shrink-0"
              >
                {picking === 'tutorial' ? '...' : 'Browse'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">C# Project Path <span className="text-gray-400">(for dotnet run)</span></label>
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.projectPath}
                onChange={(e) => setDraft({ ...draft, projectPath: e.target.value })}
                placeholder="/path/to/MyProject"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                onClick={() => browse('projectPath')}
                disabled={picking !== null}
                className="px-3 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 shrink-0"
              >
                {picking === 'project' ? '...' : 'Browse'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="darkMode"
              checked={draft.darkMode}
              onChange={(e) => setDraft({ ...draft, darkMode: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="darkMode" className="text-sm">Dark Mode</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
