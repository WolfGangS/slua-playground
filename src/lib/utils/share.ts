/**
 * Share Functionality
 * 
 * Encodes playground state into URL-safe compressed format using lz-string.
 */

import { files, activeFile } from '$lib/stores/playground';
import { get } from 'svelte/store';
import LZString from 'lz-string';

export interface ShareState {
  files: Record<string, string>;
  active: string;
  v: number; // Version for future compatibility
}

const CURRENT_VERSION = 1;

/**
 * Encode the current state to a URL-safe string.
 */
export function encodeState(state: ShareState): string {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decode a URL-safe string back to state.
 */
export function decodeState(encoded: string): ShareState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    
    const state = JSON.parse(json) as ShareState;
    
    // Validate the state
    if (!state.files || typeof state.files !== 'object') return null;
    if (!state.active || typeof state.active !== 'string') return null;
    
    return state;
  } catch {
    return null;
  }
}

/**
 * Generate a share URL and copy it to the clipboard.
 */
export async function sharePlayground(): Promise<boolean> {
  const state: ShareState = {
    files: get(files),
    active: get(activeFile),
    v: CURRENT_VERSION,
  };

  const encoded = encodeState(state);
  const url = new URL(window.location.href);
  url.hash = `code=${encoded}`;

  try {
    await navigator.clipboard.writeText(url.toString());
    return true;
  } catch {
    // Fallback: update URL in address bar
    window.history.replaceState(null, '', url.toString());
    return false;
  }
}

/**
 * Initialize share functionality.
 * Note: URL state is now loaded during store initialization to avoid race conditions.
 */
export function initShare(): void {
  // URL state is loaded during store initialization in playground.ts
  // This function is kept for potential future initialization needs
}
