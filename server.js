import express from 'express';
import cors from 'cors';
import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import { platform } from 'os';
import { createServer } from 'net';

// Check .NET SDK availability
function checkDotnet() {
  try {
    const version = execSync('dotnet --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    console.log(`✓ .NET SDK found: v${version}`);
    return true;
  } catch {
    console.warn('⚠ .NET SDK not found. Install from https://dotnet.microsoft.com/download');
    console.warn('  Test case viewing will work, but Run/Batch Run requires .NET SDK.');
    return false;
  }
}

// Find an available port
function findPort(startPort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => resolve(findPort(startPort + 1)));
  });
}

const hasDotnet = checkDotnet();
const app = express();

app.use(cors());
app.use(express.json());

// Serve built frontend in production
if (existsSync('dist')) {
  app.use(express.static('dist'));
}

// Open native folder picker dialog (macOS + Windows)
app.get('/api/pick-folder', async (req, res) => {
  try {
    const os = platform();
    let folderPath = null;

    if (os === 'darwin') {
      const result = execSync(
        `osascript -e 'POSIX path of (choose folder with prompt "Select folder")'`,
        { encoding: 'utf-8', timeout: 60000 }
      ).trim();
      folderPath = result.endsWith('/') ? result.slice(0, -1) : result;
    } else if (os === 'win32') {
      const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select folder'
$dialog.ShowNewFolderButton = $false
if ($dialog.ShowDialog() -eq 'OK') { $dialog.SelectedPath } else { '' }
      `.trim();
      const result = execSync(
        `powershell -NoProfile -Command "${psScript.replace(/\n/g, '; ')}"`,
        { encoding: 'utf-8', timeout: 60000 }
      ).trim();
      folderPath = result || null;
    } else {
      // Linux — use zenity if available
      try {
        const result = execSync(
          'zenity --file-selection --directory --title="Select folder"',
          { encoding: 'utf-8', timeout: 60000 }
        ).trim();
        folderPath = result || null;
      } catch {
        return res.status(400).json({ error: 'No folder picker available. Please type the path manually.' });
      }
    }

    res.json({ path: folderPath });
  } catch (err) {
    // User cancelled the dialog
    res.json({ path: null });
  }
});

// Scan a tutorial folder and return problem list with test cases
app.get('/api/scan', async (req, res) => {
  const folderPath = req.query.path;
  if (!folderPath) return res.status(400).json({ error: 'path required' });

  try {
    const entries = await readdir(folderPath, { withFileTypes: true });
    const problems = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

      const problemPath = join(folderPath, entry.name);

      // Try common directory names flexibly
      const subEntries = await readdir(problemPath, { withFileTypes: true });
      const inputsDirName = subEntries.find(e => e.isDirectory() && /^inputs$/i.test(e.name))?.name || 'Inputs';
      const refOutputsDirName = subEntries.find(e => e.isDirectory() && /^refoutputs$/i.test(e.name))?.name || 'RefOutputs';
      const inputsDir = join(problemPath, inputsDirName);
      const refOutputsDir = join(problemPath, refOutputsDirName);

      let inputFiles = [];
      try {
        inputFiles = await readdir(inputsDir);
        inputFiles = inputFiles.filter(f => f.endsWith('.txt'));
      } catch { continue; }

      // Read ref output filenames for flexible matching
      let refOutputFiles = [];
      try {
        refOutputFiles = await readdir(refOutputsDir);
      } catch {}

      const testCases = inputFiles.map(inputFile => {
        // Flexible ref output matching
        let refOutputFile = `RefOutput_${inputFile}`;
        if (!refOutputFiles.includes(refOutputFile)) {
          const found = refOutputFiles.find(f =>
            f.toLowerCase().replace('refoutput_', '') === inputFile.toLowerCase() ||
            f.toLowerCase() === ('refoutput_' + inputFile).toLowerCase()
          );
          if (found) refOutputFile = found;
        }
        const name = inputFile.replace('.txt', '');

        // Parse category from name with word boundary matching
        let validity = 'unknown';
        let category = 'unknown';
        const lowerName = name.toLowerCase();
        if (/\bvalid\b/i.test(lowerName) && !/\binvalid\b/i.test(lowerName)) validity = 'valid';
        else if (/\b(invalid|inalid)\b/i.test(lowerName)) validity = 'invalid';

        if (lowerName.includes('boundary')) category = 'boundary';
        else if (lowerName.includes('normal')) category = 'normal';

        return {
          name,
          inputFile,
          refOutputFile,
          validity,
          category,
        };
      });

      testCases.sort((a, b) => a.name.localeCompare(b.name));

      problems.push({
        name: entry.name,
        path: problemPath,
        inputsDir: inputsDirName,
        refOutputsDir: refOutputsDirName,
        testCases,
      });
    }

    problems.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ problems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read a specific file
app.get('/api/file', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path required' });

  try {
    const content = await readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(404).json({ error: `File not found: ${err.message}` });
  }
});

// Read input + ref output for a test case
app.get('/api/testcase', async (req, res) => {
  const { problemPath, inputFile, refOutputFile, inputsDir, refOutputsDir } = req.query;
  if (!problemPath || !inputFile || !refOutputFile) {
    return res.status(400).json({ error: 'problemPath, inputFile, refOutputFile required' });
  }

  try {
    const inputPath = join(problemPath, inputsDir || 'Inputs', inputFile);
    const refOutputPath = join(problemPath, refOutputsDir || 'RefOutputs', refOutputFile);

    const [input, refOutput] = await Promise.all([
      readFile(inputPath, 'utf-8').catch(() => '(file not found)'),
      readFile(refOutputPath, 'utf-8').catch(() => '(file not found)'),
    ]);

    res.json({ input, refOutput });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run a C# program with input
app.post('/api/run', async (req, res) => {
  const { projectPath, inputContent, timeout = 10000 } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'projectPath required' });

  try {
    const result = await runDotnet(projectPath, inputContent, timeout);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch run all test cases for a problem
app.post('/api/batch-run', async (req, res) => {
  const { projectPath, problemPath, inputsDir, refOutputsDir, testCases, timeout = 10000 } = req.body;
  if (!projectPath || !problemPath || !testCases) {
    return res.status(400).json({ error: 'projectPath, problemPath, testCases required' });
  }

  const results = [];
  for (const tc of testCases) {
    try {
      const inputPath = join(problemPath, inputsDir || 'Inputs', tc.inputFile);
      const refOutputPath = join(problemPath, refOutputsDir || 'RefOutputs', tc.refOutputFile);

      const [inputContent, expectedOutput] = await Promise.all([
        readFile(inputPath, 'utf-8').catch(() => ''),
        readFile(refOutputPath, 'utf-8').catch(() => ''),
      ]);

      const runResult = await runDotnet(projectPath, inputContent, timeout);
      const actualOutput = runResult.stdout || '';
      const passed = normalizeOutput(actualOutput) === normalizeOutput(expectedOutput);

      results.push({
        name: tc.name,
        passed,
        actualOutput,
        expectedOutput,
        error: runResult.error || null,
        exitCode: runResult.exitCode,
      });
    } catch (err) {
      results.push({
        name: tc.name,
        passed: false,
        actualOutput: '',
        expectedOutput: '',
        error: err.message,
        exitCode: -1,
      });
    }
  }

  const passCount = results.filter(r => r.passed).length;
  res.json({ results, passCount, totalCount: results.length });
});

function normalizeOutput(str) {
  return str.replace(/\r\n/g, '\n').trimEnd();
}

function stripDotnetNoise(output) {
  // Remove MSBuild/dotnet warning lines and build output that leak into stdout
  return output
    .split('\n')
    .filter(line => {
      // Filter out warning CS lines like: /path/file.cs(13,31): warning CS8604: ...
      if (/:\s*warning\s+CS\d+:/.test(line)) return false;
      // Filter out build summary lines
      if (/^\s*Build succeeded\./.test(line)) return false;
      if (/^\s*\d+ Warning\(s\)/.test(line)) return false;
      if (/^\s*\d+ Error\(s\)/.test(line)) return false;
      if (/^\s*Time Elapsed/.test(line)) return false;
      return true;
    })
    .join('\n');
}

function buildDotnet(projectPath) {
  return new Promise((resolve) => {
    const proc = spawn('dotnet', ['build', '--nologo', '-v', 'q', projectPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => resolve({ ok: code === 0, stderr }));
    proc.on('error', (err) => resolve({ ok: false, stderr: err.message }));
  });
}

function runDotnet(projectPath, inputContent, timeout) {
  return new Promise(async (resolve) => {
    // Build first to separate build warnings from program output
    const build = await buildDotnet(projectPath);
    if (!build.ok) {
      return resolve({ stdout: '', stderr: build.stderr, error: 'Build failed: ' + build.stderr, exitCode: -1 });
    }

    const proc = spawn('dotnet', ['run', '--no-build', '--project', projectPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({ stdout: stripDotnetNoise(stdout), stderr, error: 'Timeout', exitCode: -1 });
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout: stripDotnetNoise(stdout), stderr, exitCode: code, error: code !== 0 ? stderr : null });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: '', error: err.message, exitCode: -1 });
    });

    if (inputContent) {
      proc.stdin.write(inputContent);
    }
    proc.stdin.end();
  });
}

// Run endpoint guard
app.use('/api/run', (req, res, next) => {
  if (!hasDotnet) return res.status(503).json({ error: '.NET SDK not installed. Install from https://dotnet.microsoft.com/download' });
  next();
});
app.use('/api/batch-run', (req, res, next) => {
  if (!hasDotnet) return res.status(503).json({ error: '.NET SDK not installed. Install from https://dotnet.microsoft.com/download' });
  next();
});

const preferredPort = process.env.PORT || 3001;
findPort(Number(preferredPort)).then((port) => {
  app.listen(port, () => {
    console.log(`\n🚀 CAB201 TestBench server running at http://localhost:${port}\n`);
  });
});
