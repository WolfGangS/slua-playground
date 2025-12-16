/**
 * Simplified CodeMirror Editor for Embed Component
 * 
 * A lightweight editor setup without LSP features for the embed use case.
 */

import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, highlightSpecialChars } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, StreamLanguage } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';

// Simple Lua/Luau syntax highlighting using StreamLanguage
const luauLanguage = StreamLanguage.define({
  name: 'luau',
  startState: () => ({}),
  token(stream) {
    // Skip whitespace
    if (stream.eatSpace()) return null;
    
    // Comments
    if (stream.match('--[[')) {
      stream.skipTo(']]') || stream.skipToEnd();
      stream.match(']]');
      return 'comment';
    }
    if (stream.match('--')) {
      stream.skipToEnd();
      return 'comment';
    }
    
    // Strings
    if (stream.match(/^"(?:[^"\\]|\\.)*"/)) return 'string';
    if (stream.match(/^'(?:[^'\\]|\\.)*'/)) return 'string';
    if (stream.match('`')) {
      // Template string
      while (!stream.eol()) {
        if (stream.next() === '`') break;
      }
      return 'string';
    }
    if (stream.match(/^\[\[/)) {
      stream.skipTo(']]') || stream.skipToEnd();
      stream.match(']]');
      return 'string';
    }
    
    // Numbers
    if (stream.match(/^0x[0-9a-fA-F]+/) || stream.match(/^[0-9]+\.?[0-9]*([eE][+-]?[0-9]+)?/)) {
      return 'number';
    }
    
    // Keywords
    const keywords = ['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 
      'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while',
      'continue', 'export', 'type', 'typeof'];
    
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      const word = stream.current();
      if (keywords.includes(word)) return 'keyword';
      if (word === 'self') return 'variableName.special';
      return 'variableName';
    }
    
    // Operators
    if (stream.match(/^[+\-*/%^#=<>~]+/) || stream.match(/^\.\.\.?/)) {
      return 'operator';
    }
    
    // Punctuation
    if (stream.match(/^[(){}[\],;:.]/)) {
      return 'punctuation';
    }
    
    stream.next();
    return null;
  },
});

// Light theme
const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  },
  '.cm-content': {
    caretColor: '#1a1a1a',
  },
  '.cm-cursor': {
    borderLeftColor: '#1a1a1a',
  },
  '.cm-gutters': {
    backgroundColor: '#f8f9fa',
    color: '#9aa0a6',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f1f3f4',
  },
  '.cm-activeLine': {
    backgroundColor: '#f8f9fa',
  },
}, { dark: false });

// Dark theme
const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
  },
  '.cm-content': {
    caretColor: '#e0e0e0',
  },
  '.cm-cursor': {
    borderLeftColor: '#e0e0e0',
  },
  '.cm-gutters': {
    backgroundColor: '#252526',
    color: '#6e6e6e',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2d2d30',
  },
  '.cm-activeLine': {
    backgroundColor: '#252526',
  },
}, { dark: true });

// Syntax highlighting colors (light)
const lightHighlighting = EditorView.theme({
  '.cm-keyword': { color: '#0000ff' },
  '.cm-string': { color: '#a31515' },
  '.cm-number': { color: '#098658' },
  '.cm-comment': { color: '#008000' },
  '.cm-variableName': { color: '#001080' },
  '.cm-variableName.special': { color: '#0070c1' },
  '.cm-operator': { color: '#1a1a1a' },
  '.cm-punctuation': { color: '#1a1a1a' },
});

// Syntax highlighting colors (dark)
const darkHighlighting = EditorView.theme({
  '.cm-keyword': { color: '#569cd6' },
  '.cm-string': { color: '#ce9178' },
  '.cm-number': { color: '#b5cea8' },
  '.cm-comment': { color: '#6a9955' },
  '.cm-variableName': { color: '#9cdcfe' },
  '.cm-variableName.special': { color: '#4ec9b0' },
  '.cm-operator': { color: '#d4d4d4' },
  '.cm-punctuation': { color: '#d4d4d4' },
});

export type Theme = 'light' | 'dark' | 'auto';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getThemeExtensions(theme: Theme): Extension[] {
  const effectiveTheme = theme === 'auto' ? getSystemTheme() : theme;
  
  if (effectiveTheme === 'dark') {
    return [darkTheme, darkHighlighting];
  }
  return [lightTheme, lightHighlighting];
}

export interface EmbedEditorOptions {
  container: HTMLElement;
  content: string;
  readonly?: boolean;
  theme?: Theme;
  onChange?: (content: string) => void;
}

export interface EmbedEditor {
  view: EditorView;
  getContent: () => string;
  setContent: (content: string) => void;
  setTheme: (theme: Theme) => void;
  destroy: () => void;
}

export function createEmbedEditor(options: EmbedEditorOptions): EmbedEditor {
  const { container, content, readonly = false, theme = 'auto', onChange } = options;
  
  const themeCompartment = new Compartment();
  const readonlyCompartment = new Compartment();
  
  const extensions: Extension[] = [
    // Basic features
    lineNumbers(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    
    // Keymaps
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab,
    ]),
    
    // Luau language
    luauLanguage,
    
    // Theme
    themeCompartment.of(getThemeExtensions(theme)),
    
    // Readonly state
    readonlyCompartment.of(EditorState.readOnly.of(readonly)),
    
    // Base styling
    EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '14px',
      },
      '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        overflow: 'auto',
      },
      '.cm-content': {
        padding: '12px 0',
      },
      '.cm-gutters': {
        paddingLeft: '8px',
      },
    }),
  ];
  
  // Add change listener if provided
  if (onChange) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      })
    );
  }
  
  const state = EditorState.create({
    doc: content,
    extensions,
  });
  
  const view = new EditorView({
    state,
    parent: container,
  });
  
  // Listen for system theme changes when using auto
  let mediaQueryListener: (() => void) | null = null;
  if (theme === 'auto') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      view.dispatch({
        effects: themeCompartment.reconfigure(getThemeExtensions('auto')),
      });
    };
    mediaQuery.addEventListener('change', handleChange);
    mediaQueryListener = () => mediaQuery.removeEventListener('change', handleChange);
  }
  
  return {
    view,
    
    getContent(): string {
      return view.state.doc.toString();
    },
    
    setContent(newContent: string): void {
      const currentContent = view.state.doc.toString();
      if (currentContent !== newContent) {
        view.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: newContent,
          },
        });
      }
    },
    
    setTheme(newTheme: Theme): void {
      view.dispatch({
        effects: themeCompartment.reconfigure(getThemeExtensions(newTheme)),
      });
    },
    
    destroy(): void {
      if (mediaQueryListener) {
        mediaQueryListener();
      }
      view.destroy();
    },
  };
}

