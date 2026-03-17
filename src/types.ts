export interface TestCase {
  name: string;
  inputFile: string;
  refOutputFile: string;
  validity: 'valid' | 'invalid' | 'unknown';
  category: 'boundary' | 'normal' | 'unknown';
}

export interface Problem {
  name: string;
  path: string;
  inputsDir?: string;
  refOutputsDir?: string;
  testCases: TestCase[];
}

export interface BatchResult {
  name: string;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  error: string | null;
  exitCode: number;
}

export interface Settings {
  tutorialPath: string;
  projectPath: string;
  darkMode: boolean;
}
