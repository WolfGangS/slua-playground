# Luau Playground

A browser-based Luau code playground with execution and IDE features.

![Luau Playground](https://img.shields.io/badge/Luau-Playground-blue)

## Features

- **Code Execution**: Run Luau code directly in the browser via WebAssembly
- **Syntax Highlighting**: Full Luau syntax support with light/dark themes
- **IDE Features**: 
  - Real-time diagnostics (type errors, lint warnings)
  - Autocomplete with type information
  - Hover tooltips for type inspection
- **Multi-file Support**: Create and manage multiple files with tabs
- **Sharing**: Compress and share playground state via URL
- **Mobile Friendly**: Responsive design that works on phones and tablets
- **Theme Support**: System theme detection with manual toggle (light/dark/system)

## Tech Stack

- **Frontend**: Svelte 5 + Vite
- **Editor**: CodeMirror 6 with custom Luau language mode
- **Styling**: Tailwind CSS 4 + shadcn-svelte components
- **Runtime**: Luau compiled to WebAssembly
- **Sharing**: LZ-String compression for URL encoding

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Building the WASM Module

The Luau WASM module needs to be built separately using Emscripten:

```bash
cd wasm

# Install Emscripten if not already installed
# See: https://emscripten.org/docs/getting_started/downloads.html

# Activate Emscripten
source ~/emsdk/emsdk_env.sh  # Adjust path as needed

# Build
./build.sh release
```

The built WASM files will be copied to `static/wasm/`.

## Project Structure

```
playground/
├── src/
│   ├── lib/
│   │   ├── components/       # UI components
│   │   │   ├── ui/           # shadcn-svelte components
│   │   │   ├── TabBar.svelte
│   │   │   ├── Editor.svelte
│   │   │   └── Output.svelte
│   │   ├── editor/           # CodeMirror setup
│   │   │   ├── setup.ts      # Editor initialization
│   │   │   ├── luauLanguage.ts # Syntax highlighting
│   │   │   ├── lspExtensions.ts # Diagnostics, autocomplete, hover
│   │   │   └── themes.ts     # Light/dark themes
│   │   ├── luau/             # WASM integration
│   │   │   ├── wasm.ts       # Module loader
│   │   │   └── types.ts      # TypeScript types
│   │   ├── stores/           # Svelte stores
│   │   │   └── playground.ts # App state
│   │   └── utils/
│   │       ├── theme.ts      # Theme detection
│   │       └── share.ts      # URL encoding
│   ├── App.svelte
│   └── main.ts
├── static/
│   └── wasm/                 # Built WASM files
├── wasm/                     # WASM source
│   ├── src/
│   │   └── playground.cpp    # C++ bindings
│   ├── luau/                 # Luau source (git clone)
│   ├── CMakeLists.txt
│   └── build.sh
└── package.json
```

## API

### URL Parameters

Share playground state via URL hash:

```
https://playground.luau.org/#code=<compressed-state>
```

The state is LZ-String compressed JSON containing:
- `files`: Object mapping filenames to content
- `active`: Currently active filename
- `v`: Version number for compatibility

## License

MIT
