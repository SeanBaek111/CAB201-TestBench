import { diffLines } from 'diff';

interface Props {
  expected: string;
  actual: string;
}

export default function DiffViewer({ expected, actual }: Props) {
  const normalizedExpected = expected.replace(/\r\n/g, '\n').trimEnd();
  const normalizedActual = actual.replace(/\r\n/g, '\n').trimEnd();
  const isMatch = normalizedExpected === normalizedActual;
  const changes = diffLines(normalizedExpected, normalizedActual);

  let lineNum = 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 py-1.5 text-xs font-semibold bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">Expected vs Actual</span>
        {isMatch ? (
          <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 text-xs">PASS</span>
        ) : (
          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 text-xs">FAIL</span>
        )}
      </div>
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-950">
        <table className="file-content w-full border-collapse">
          <tbody>
            {changes.map((change, ci) => {
              const lines = change.value.split('\n');
              // diffLines adds trailing empty string from split
              if (lines[lines.length - 1] === '') lines.pop();

              return lines.map((line, li) => {
                lineNum++;
                const cls = change.added
                  ? 'diff-added'
                  : change.removed
                  ? 'diff-removed'
                  : 'diff-match';
                const prefix = change.added ? '+' : change.removed ? '-' : ' ';

                return (
                  <tr key={`${ci}-${li}`} className={cls}>
                    <td className="line-number">{lineNum}</td>
                    <td className="pl-1 pr-2 text-gray-400 select-none">{prefix}</td>
                    <td className="whitespace-pre">{line || '\u00A0'}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
