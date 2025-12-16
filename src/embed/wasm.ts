/**
 * Luau WASM Loader for Embed Component
 * 
 * Loads the Luau WASM module from play.luau.org CDN.
 * Lazy loads on first interaction for better performance.
 */

import type { ExecuteResult, LuauDiagnostic, DiagnosticsResult } from '$lib/luau/types';

// Re-export types for convenience
export type { ExecuteResult, LuauDiagnostic };

interface LuauWasmModule {
  ccall(name: string, returnType: string | null, argTypes: string[], args: unknown[]): unknown;
}

const PLAYGROUND_BASE_URL = 'https://play.luau.org';

let wasmModule: LuauWasmModule | null = null;
let modulePromise: Promise<LuauWasmModule> | null = null;
let loadError: Error | null = null;

/**
 * Check if the WASM module is loaded
 */
export function isLoaded(): boolean {
  return wasmModule !== null;
}

/**
 * Check if there was an error loading the module
 */
export function getLoadError(): Error | null {
  return loadError;
}

/**
 * Load the Luau WASM module from CDN
 */
export async function loadWasm(): Promise<LuauWasmModule> {
  if (wasmModule) {
    return wasmModule;
  }
  
  if (loadError) {
    throw loadError;
  }
  
  if (modulePromise) {
    return modulePromise;
  }
  
  modulePromise = (async () => {
    try {
      // Dynamically import the Luau module factory from CDN
      const moduleUrl = `${PLAYGROUND_BASE_URL}/wasm/luau.js`;
      
      // Create a script element to load the module
      // We need to use this approach because the module uses Emscripten's
      // module loading pattern which isn't a standard ES module
      const response = await fetch(moduleUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch Luau module: ${response.status}`);
      }
      
      const moduleCode = await response.text();
      
      // Create a function that returns the module factory
      // The Emscripten module assigns to 'Module' or returns from the factory
      const factory = new Function(`
        ${moduleCode}
        return createLuauModule;
      `)();
      
      // Initialize the module with locateFile to point to CDN
      const module = await factory({
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return `${PLAYGROUND_BASE_URL}/wasm/luau.wasm`;
          }
          return `${PLAYGROUND_BASE_URL}/wasm/${path}`;
        },
      });
      
      wasmModule = module;
      return module;
    } catch (error) {
      loadError = error instanceof Error ? error : new Error(String(error));
      modulePromise = null;
      throw loadError;
    }
  })();
  
  return modulePromise;
}

/**
 * Register files as modules for require support
 */
export async function registerModules(files: Record<string, string>): Promise<void> {
  const module = await loadWasm();
  
  // Clear existing modules
  try {
    module.ccall('luau_clear_modules', null, [], []);
  } catch {
    // Ignore clear errors
  }
  
  // Register each file as a module
  for (const [name, content] of Object.entries(files)) {
    try {
      // Register with the file name
      module.ccall('luau_add_module', null, ['string', 'string'], [name, content]);
      
      // Also register without extension for convenience
      const nameWithoutExt = name.replace(/\.(luau|lua)$/, '');
      if (nameWithoutExt !== name) {
        module.ccall('luau_add_module', null, ['string', 'string'], [nameWithoutExt, content]);
      }
    } catch {
      // Ignore individual module registration errors
    }
  }
}

/**
 * Execute Luau code
 */
export async function executeCode(code: string): Promise<ExecuteResult> {
  const module = await loadWasm();
  
  try {
    const resultJson = module.ccall('luau_execute', 'string', ['string'], [code]) as string;
    if (!resultJson) {
      return {
        success: false,
        output: '',
        error: 'No result returned from execution',
      };
    }
    return JSON.parse(resultJson) as ExecuteResult;
  } catch (error) {
    let errorMsg = 'Unknown execution error';
    if (error instanceof Error) {
      errorMsg = error.message;
    } else if (typeof error === 'number') {
      errorMsg = `Uncaught Luau exception (code: ${error})`;
    } else {
      errorMsg = String(error);
    }
    
    return {
      success: false,
      output: '',
      error: errorMsg,
    };
  }
}

/**
 * Get diagnostics for code
 */
export async function getDiagnostics(code: string): Promise<LuauDiagnostic[]> {
  const module = await loadWasm();
  
  try {
    const resultJson = module.ccall('luau_get_diagnostics', 'string', ['string'], [code]) as string;
    const result = JSON.parse(resultJson) as DiagnosticsResult;
    return result.diagnostics;
  } catch (error) {
    console.error('[Luau Embed] Diagnostics error:', error);
    return [];
  }
}

/**
 * Run code with all files registered as modules
 */
export async function runWithModules(
  files: Record<string, string>,
  activeFile: string
): Promise<{ result: ExecuteResult; elapsed: number }> {
  await registerModules(files);
  
  const code = files[activeFile] || '';
  const startTime = performance.now();
  const result = await executeCode(code);
  const elapsed = performance.now() - startTime;
  
  return { result, elapsed };
}

/**
 * Check code with all files registered as modules
 */
export async function checkWithModules(
  files: Record<string, string>,
  activeFile: string
): Promise<{ diagnostics: LuauDiagnostic[]; elapsed: number }> {
  // Register all files for cross-file type checking
  const module = await loadWasm();
  
  for (const [name, content] of Object.entries(files)) {
    try {
      module.ccall('luau_set_source', null, ['string', 'string'], [name, content]);
      
      const nameWithoutExt = name.replace(/\.(luau|lua)$/, '');
      if (nameWithoutExt !== name) {
        module.ccall('luau_set_source', null, ['string', 'string'], [nameWithoutExt, content]);
      }
    } catch {
      // Ignore registration errors
    }
  }
  
  const code = files[activeFile] || '';
  const startTime = performance.now();
  const diagnostics = await getDiagnostics(code);
  const elapsed = performance.now() - startTime;
  
  return { diagnostics, elapsed };
}

