/**
 * CodeMirror Themes for Luau Playground
 * 
 * Custom light and dark themes that match the playground's design.
 */

import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { tags } from '@lezer/highlight';

// ============================================================================
// Dark Theme (default)
// ============================================================================

const darkColors = {
  background: 'oklch(0.1 0.015 250)',
  foreground: 'oklch(0.9 0.01 250)',
  selection: 'rgba(60, 130, 200, 0.4)',  // Clear blue selection
  activeLine: 'oklch(0.15 0.01 250)',
  cursor: 'oklch(0.6 0.25 270)',
  lineNumber: 'oklch(0.45 0.02 250)',
  lineNumberActive: 'oklch(0.7 0.02 250)',
  gutterBackground: 'oklch(0.12 0.015 250)',
  
  // Syntax colors
  keyword: 'oklch(0.75 0.15 300)',      // Purple
  string: 'oklch(0.7 0.15 140)',        // Green
  number: 'oklch(0.75 0.12 70)',        // Orange
  comment: 'oklch(0.5 0.02 250)',       // Gray
  function: 'oklch(0.75 0.15 220)',     // Blue
  variable: 'oklch(0.85 0.05 250)',     // Light gray
  type: 'oklch(0.7 0.15 180)',          // Cyan
  operator: 'oklch(0.7 0.1 50)',        // Orange-ish
  punctuation: 'oklch(0.65 0.02 250)',  // Gray
  bool: 'oklch(0.75 0.12 70)',          // Orange (same as number)
  builtin: 'oklch(0.75 0.12 200)',      // Light blue
};

export const darkTheme: Extension = [
  EditorView.theme({
    '&': {
      backgroundColor: darkColors.background,
      color: darkColors.foreground,
    },
    '.cm-content': {
      caretColor: darkColors.cursor,
      fontFamily: 'var(--font-mono)',
      position: 'relative',
      zIndex: '1',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: darkColors.cursor,
    },
    // Selection layer needs to be above the content layer
    '.cm-scroller': {
      position: 'relative',
    },
    '.cm-selectionLayer': {
      zIndex: '10',
      pointerEvents: 'none',
    },
    // Selection highlighting
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: `${darkColors.selection} !important`,
    },
    '.cm-gutters': {
      backgroundColor: darkColors.gutterBackground,
      color: darkColors.lineNumber,
      borderRight: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: darkColors.activeLine,
      color: darkColors.lineNumberActive,
    },
    // Active line with background
    '.cm-activeLine': {
      backgroundColor: darkColors.activeLine,
    },
    '.cm-line': {
      padding: '0 16px 0 4px',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'oklch(0.25 0.05 160)',
      outline: '1px solid oklch(0.4 0.1 160)',
    },
  }, { dark: true }),
  
  syntaxHighlighting(HighlightStyle.define([
    { tag: tags.keyword, color: darkColors.keyword },
    { tag: tags.string, color: darkColors.string },
    { tag: tags.number, color: darkColors.number },
    { tag: tags.bool, color: darkColors.bool },
    { tag: tags.null, color: darkColors.bool },
    { tag: tags.comment, color: darkColors.comment, fontStyle: 'italic' },
    { tag: tags.function(tags.variableName), color: darkColors.function },
    { tag: tags.variableName, color: darkColors.variable },
    { tag: [tags.standard(tags.variableName), tags.definition(tags.variableName)], color: darkColors.builtin },
    { tag: tags.typeName, color: darkColors.type },
    { tag: tags.operator, color: darkColors.operator },
    { tag: tags.punctuation, color: darkColors.punctuation },
    { tag: tags.bracket, color: darkColors.punctuation },
  ])),
];

// ============================================================================
// Light Theme
// ============================================================================

const lightColors = {
  background: '#ffffff',
  foreground: 'oklch(0.2 0.02 250)',
  selection: 'rgba(60, 130, 200, 0.25)',
  activeLine: 'oklch(0.97 0.005 250)',
  cursor: 'oklch(0.5 0.28 270)',
  lineNumber: 'oklch(0.6 0.02 250)',
  lineNumberActive: 'oklch(0.3 0.02 250)',
  gutterBackground: 'oklch(0.97 0.005 250)',
  
  // Syntax colors
  keyword: 'oklch(0.45 0.2 300)',       // Purple
  string: 'oklch(0.45 0.15 140)',       // Green
  number: 'oklch(0.5 0.15 50)',         // Orange
  comment: 'oklch(0.55 0.02 250)',      // Gray
  function: 'oklch(0.45 0.2 220)',      // Blue
  variable: 'oklch(0.25 0.02 250)',     // Dark gray
  type: 'oklch(0.45 0.15 180)',         // Cyan
  operator: 'oklch(0.45 0.12 50)',      // Orange
  punctuation: 'oklch(0.4 0.02 250)',   // Gray
  bool: 'oklch(0.5 0.15 50)',           // Orange
  builtin: 'oklch(0.45 0.15 200)',      // Blue
};

export const lightTheme: Extension = [
  EditorView.theme({
    '&': {
      backgroundColor: lightColors.background,
      color: lightColors.foreground,
    },
    '.cm-content': {
      caretColor: lightColors.cursor,
      fontFamily: 'var(--font-mono)',
      position: 'relative',
      zIndex: '1',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: lightColors.cursor,
    },
    // Selection layer needs to be above the content layer
    '.cm-scroller': {
      position: 'relative',
    },
    '.cm-selectionLayer': {
      zIndex: '10 !important',
      pointerEvents: 'none',
    },
    // Selection highlighting
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: `${lightColors.selection} !important`,
    },
    '.cm-gutters': {
      backgroundColor: lightColors.gutterBackground,
      color: lightColors.lineNumber,
      borderRight: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: lightColors.activeLine,
      color: lightColors.lineNumberActive,
    },
    // Active line with background
    '.cm-activeLine': {
      backgroundColor: lightColors.activeLine,
    },
    '.cm-line': {
      padding: '0 16px 0 4px',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'oklch(0.85 0.1 160)',
      outline: '1px solid oklch(0.6 0.15 160)',
    },
  }, { dark: false }),
  
  syntaxHighlighting(HighlightStyle.define([
    { tag: tags.keyword, color: lightColors.keyword },
    { tag: tags.string, color: lightColors.string },
    { tag: tags.number, color: lightColors.number },
    { tag: tags.bool, color: lightColors.bool },
    { tag: tags.null, color: lightColors.bool },
    { tag: tags.comment, color: lightColors.comment, fontStyle: 'italic' },
    { tag: tags.function(tags.variableName), color: lightColors.function },
    { tag: tags.variableName, color: lightColors.variable },
    { tag: [tags.standard(tags.variableName), tags.definition(tags.variableName)], color: lightColors.builtin },
    { tag: tags.typeName, color: lightColors.type },
    { tag: tags.operator, color: lightColors.operator },
    { tag: tags.punctuation, color: lightColors.punctuation },
    { tag: tags.bracket, color: lightColors.punctuation },
  ])),
];

