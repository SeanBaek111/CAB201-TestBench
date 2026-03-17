# CAB201 TestCase Viewer

A local tool for viewing and running CAB201 test cases. Compare your C# program's output against expected results with side-by-side diff view.

## Features

- **Test Case Browser** — Browse problems and test cases with sidebar navigation
- **Side-by-Side View** — Input and Expected Output displayed with line numbers
- **Run & Compare** — Execute your C# project against test cases and see diff
- **Batch Run** — Run all test cases at once, see pass/fail summary
- **Filter** — Filter by Valid/Invalid, Boundary/Normal
- **Keyboard Navigation** — Arrow keys or j/k to navigate, Escape to go back
- **Dark/Light Theme** — Toggle in Settings

## Prerequisites

- **Node.js** 18+ — [Download](https://nodejs.org/)
- **.NET SDK** 6+ — [Download](https://dotnet.microsoft.com/download) *(required for Run/Batch Run only)*

Check if installed:

```bash
node --version    # should show v18+
dotnet --version  # should show 6.0+
```

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/CAB201_TestCase_Viewer.git
cd CAB201_TestCase_Viewer

# 2. Install dependencies
npm install

# 3. Run
npm run dev
```

The app opens at **http://localhost:5173**.

## Usage

1. Click **Settings** in the top-right
2. Set **Tutorial Folder Path** — the folder containing your test case problems
3. Set **C# Project Path** — your .csproj project folder (for Run/Batch Run)
4. Browse problems in the sidebar, click a test case to view
5. Click **Run** to execute your code against the selected test case
6. Click **Batch Run** to test all cases at once

### Expected Folder Structure

```
Tutorial 3 - Input and Output/
├── Problem1/
│   ├── Inputs/
│   │   ├── Valid - Normal - basic.txt
│   │   └── Invalid - Boundary - empty.txt
│   └── RefOutputs/
│       ├── RefOutput_Valid - Normal - basic.txt
│       └── RefOutput_Invalid - Boundary - empty.txt
└── Problem2/
    ├── Inputs/
    └── RefOutputs/
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↓` or `j` | Next test case |
| `↑` or `k` | Previous test case |
| `Escape` | Go back (case → problem → overview) |

## Production Build

```bash
npm run build   # Build frontend
npm start       # Start server (serves built frontend)
```

## Troubleshooting

**"dotnet: command not found"**
Install .NET SDK from https://dotnet.microsoft.com/download. The viewer still works for browsing test cases without .NET.

**Port already in use**
The server auto-finds an available port starting from 3001.

**Browse button doesn't work (non-macOS)**
Type the folder path manually in the Settings input field. The native folder picker only works on macOS.
