<script lang="ts">
  import { files, activeFile, cursorLine } from '$lib/stores/playground';
  import { settings, showBytecode, toggleBytecode } from '$lib/stores/settings';
  import { getBytecode } from '$lib/luau/wasm';
  import { Button } from '$lib/components/ui/button';
  import { Icon } from '$lib/icons';

  interface ParsedLine {
    raw: string;
    sourceLine: number | null;  // For highlighting
    type: 'empty' | 'func-header' | 'bytecode' | 'ir-comment' | 'asm' | 'comment' | 'other';
  }

  let bytecodeContent = $state('');
  let parsedLines = $state<ParsedLine[]>([]);
  let outputFormat = $state(0);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  // Refresh bytecode when file content or settings change
  $effect(() => {
    if ($showBytecode) {
      const code = $files[$activeFile] || '';
      const opts = $settings;
      outputFormat = opts.outputFormat;
      refreshBytecode(code, opts.optimizationLevel, opts.debugLevel, opts.compilerRemarks, opts.outputFormat);
    }
  });

  function parseLines(raw: string): ParsedLine[] {
    const lines = raw.split('\n');
    return lines.map(line => {
      const trimmed = line.trim();
      
      // Empty line
      if (!trimmed) {
        return { raw: line, sourceLine: null, type: 'empty' as const };
      }

      // VM bytecode line: starts with "N: " where N is line number
      // e.g., "5: LOADK R2 K0 ['Hello']" or "14: L0: ADD R2 R2 R7"
      const bytecodeMatch = trimmed.match(/^(\d+):\s/);
      if (bytecodeMatch) {
        return { 
          raw: line, 
          sourceLine: parseInt(bytecodeMatch[1], 10),
          type: 'bytecode' as const
        };
      }

      // Function header (VM format): "Function N (name):"
      if (trimmed.match(/^Function\s+\d+\s*\([^)]*\)\s*:?$/)) {
        return { raw: line, sourceLine: null, type: 'func-header' as const };
      }

      // IR/ASM function header: "; function name() line N"
      if (trimmed.match(/^;\s*function\s/)) {
        return { raw: line, sourceLine: null, type: 'func-header' as const };
      }

      // IR comment lines starting with #
      if (trimmed.startsWith('#')) {
        return { raw: line, sourceLine: null, type: 'ir-comment' as const };
      }

      // Comment lines starting with ;
      if (trimmed.startsWith(';')) {
        return { raw: line, sourceLine: null, type: 'comment' as const };
      }

      // Assembly labels (.L11:) or instructions
      if (trimmed.startsWith('.') || trimmed.match(/^[a-z]/i)) {
        return { raw: line, sourceLine: null, type: 'asm' as const };
      }

      return { raw: line, sourceLine: null, type: 'other' as const };
    });
  }

  // Syntax highlight a line based on its content
  function highlightLine(line: string, type: string): string {
    // Escape HTML
    let escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (type === 'func-header') {
      // VM: "Function N (name):"
      escaped = escaped.replace(
        /^(Function\s+)(\d+)(\s*\()([^)]*)(\)\s*:?)$/,
        '<span class="hl-keyword">$1</span><span class="hl-number">$2</span>$3<span class="hl-func">$4</span>$5'
      );
      // IR/ASM: "; function name() line N"
      escaped = escaped.replace(
        /^(;\s*)(function\s+)(\w*)(\([^)]*\))(\s*line\s+)(\d+)$/,
        '<span class="hl-comment">$1</span><span class="hl-keyword">$2</span><span class="hl-func">$3</span>$4<span class="hl-comment">$5</span><span class="hl-number">$6</span>'
      );
      return escaped;
    }

    if (type === 'bytecode') {
      // Highlight: "N: [L0: ]OPCODE operands [comment]"
      escaped = escaped.replace(
        /^(\s*)(\d+)(:\s*)(?:(L\d+)(:\s*))?(\w+)(\s+)([^\[]*?)(\s*\[([^\]]+)\])?$/,
        (_, indent, lineNum, colon1, label, colon2, opcode, space1, operands, bracketPart, comment) => {
          let result = `${indent}<span class="hl-linenum">${lineNum}</span>${colon1}`;
          if (label) {
            result += `<span class="hl-label">${label}</span>${colon2}`;
          }
          result += `<span class="hl-opcode">${opcode}</span>${space1}`;
          // Highlight registers (R0-R99) and constants (K0-K99)
          const highlightedOperands = operands
            .replace(/\b(R\d+)\b/g, '<span class="hl-register">$1</span>')
            .replace(/\b(K\d+)\b/g, '<span class="hl-constant">$1</span>')
            .replace(/\b(L\d+)\b/g, '<span class="hl-label">$1</span>');
          result += highlightedOperands;
          if (comment) {
            result += `<span class="hl-comment"> [${comment}]</span>`;
          }
          return result;
        }
      );
      return escaped;
    }

    if (type === 'ir-comment') {
      // Block headers: "# bb_name:" - highlight block name
      escaped = escaped.replace(
        /^(#\s*)(bb_\w+)(:.*)?$/,
        '<span class="hl-ir-prefix">$1</span><span class="hl-block">$2</span><span class="hl-comment">$3</span>'
      );
      // IR instructions with assignment: "#   %N = OP args"
      escaped = escaped.replace(
        /^(#\s+)(%\d+)(\s*=\s*)(\w+)(.*)$/,
        '<span class="hl-ir-prefix">$1</span><span class="hl-ir-var">$2</span>$3<span class="hl-ir-op">$4</span><span class="hl-ir-args">$5</span>'
      );
      // IR instructions without assignment: "#   OP args"
      if (!escaped.includes('hl-ir-op')) {
        escaped = escaped.replace(
          /^(#\s+)(\w+)(\s+.*)$/,
          '<span class="hl-ir-prefix">$1</span><span class="hl-ir-op">$2</span><span class="hl-ir-args">$3</span>'
        );
      }
      return escaped;
    }

    if (type === 'comment') {
      return `<span class="hl-comment">${escaped}</span>`;
    }

    if (type === 'asm') {
      // Assembly label: ".L11:"
      escaped = escaped.replace(
        /^(\s*)(\.[A-Za-z0-9_]+)(:)$/,
        '$1<span class="hl-label">$2</span>$3'
      );
      // Assembly instruction: "op args"
      if (!escaped.includes('hl-label')) {
        escaped = escaped.replace(
          /^(\s*)([a-z][a-z0-9.]*)(\s+)(.*)$/i,
          '$1<span class="hl-asm-op">$2</span>$3<span class="hl-asm-args">$4</span>'
        );
      }
      return escaped;
    }

    // Type annotations: "type <- type, type"
    escaped = escaped.replace(
      /^(\w+)(\s*&lt;-\s*)(.+)$/,
      '<span class="hl-type">$1</span><span class="hl-comment">$2$3</span>'
    );

    return escaped;
  }

  async function refreshBytecode(
    code: string,
    optimizationLevel: number,
    debugLevel: number,
    showRemarks: boolean,
    format: number
  ) {
    isLoading = true;
    error = null;
    
    try {
      const result = await getBytecode(code, optimizationLevel, debugLevel, format, showRemarks);
      if (result.success) {
        bytecodeContent = result.bytecode;
        parsedLines = parseLines(result.bytecode);
      } else {
        error = result.error || 'Compilation failed';
        bytecodeContent = '';
        parsedLines = [];
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('is not a function') || errMsg.includes('undefined')) {
        error = 'WASM module needs to be rebuilt.\nRun: cd wasm && ./build.sh';
      } else {
        error = errMsg;
      }
      bytecodeContent = '';
      parsedLines = [];
    } finally {
      isLoading = false;
    }
  }

  function getFormatLabel(format: number): string {
    switch (format) {
      case 0: return 'VM Bytecode';
      case 1: return 'IR';
      case 2: return 'x64 Assembly';
      case 3: return 'ARM64 Assembly';
      default: return 'Bytecode';
    }
  }
</script>

{#if $showBytecode}
  <div class="flex flex-col h-full border-t sm:border-t-0 sm:border-l border-(--border-color) bg-(--bg-editor)">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-(--border-color) bg-(--bg-secondary) shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-(--text-primary)">{getFormatLabel(outputFormat)}</span>
        {#if isLoading}
          <span class="text-xs text-(--text-muted) animate-pulse">compiling...</span>
        {/if}
      </div>
      <Button size="sm" variant="ghost" onclick={toggleBytecode} class="h-6 w-6 p-0 min-w-0">
        <Icon name="x" size={16} />
      </Button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto font-mono text-xs leading-relaxed min-h-0 bytecode-view">
      {#if error}
        <div class="text-error-500 p-3">
          <div class="font-semibold mb-1">Compilation Error:</div>
          <pre class="whitespace-pre-wrap">{error}</pre>
        </div>
      {:else if parsedLines.length > 0}
        <div class="bytecode-content">
          {#each parsedLines as line}
            <div 
              class="line" 
              class:highlighted={line.sourceLine === $cursorLine}
              class:empty={line.type === 'empty'}
            >
              {@html highlightLine(line.raw, line.type)}
            </div>
          {/each}
        </div>
      {:else if bytecodeContent}
        <pre class="text-(--text-primary) whitespace-pre p-3">{bytecodeContent}</pre>
      {:else if !isLoading}
        <span class="text-(--text-muted) italic p-3">No bytecode generated</span>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* Light mode colors */
  .bytecode-view {
    --hl-keyword: oklch(0.45 0.2 25);
    --hl-func: oklch(0.45 0.2 25);
    --hl-opcode: oklch(0.45 0.18 85);
    --hl-register: oklch(0.45 0.22 250);
    --hl-constant: oklch(0.45 0.18 145);
    --hl-comment: oklch(0.5 0.05 250);
    --hl-linenum: oklch(0.55 0.02 250);
    --hl-label: oklch(0.5 0.22 30);
    --hl-number: oklch(0.45 0.15 145);
    --hl-block: oklch(0.4 0.15 280);
    --hl-type: oklch(0.45 0.15 180);
    --hl-ir-prefix: oklch(0.55 0.08 280);
    --hl-ir-var: oklch(0.45 0.15 200);
    --hl-ir-op: oklch(0.42 0.12 250);
    --hl-ir-args: oklch(0.5 0.08 250);
    --hl-asm-op: oklch(0.4 0.15 260);
    --hl-asm-args: oklch(0.5 0.08 250);
    --hl-highlight-bg: oklch(0.92 0.05 90);
  }

  /* Dark mode colors */
  :global(.dark) .bytecode-view {
    --hl-keyword: oklch(0.7 0.18 25);
    --hl-func: oklch(0.7 0.18 25);
    --hl-opcode: oklch(0.78 0.15 85);
    --hl-register: oklch(0.72 0.18 250);
    --hl-constant: oklch(0.7 0.15 145);
    --hl-comment: oklch(0.55 0.02 250);
    --hl-linenum: oklch(0.5 0.02 250);
    --hl-label: oklch(0.68 0.2 30);
    --hl-number: oklch(0.7 0.12 145);
    --hl-block: oklch(0.7 0.12 280);
    --hl-type: oklch(0.65 0.12 180);
    --hl-ir-prefix: oklch(0.5 0.06 280);
    --hl-ir-var: oklch(0.65 0.12 200);
    --hl-ir-op: oklch(0.68 0.1 250);
    --hl-ir-args: oklch(0.58 0.06 250);
    --hl-asm-op: oklch(0.72 0.12 260);
    --hl-asm-args: oklch(0.58 0.06 250);
    --hl-highlight-bg: oklch(0.3 0.05 90);
  }

  .bytecode-content {
    padding: 0.75rem 0;
  }

  .line {
    padding: 0 0.75rem;
    white-space: pre;
    min-height: 1.25em;
  }

  .line.empty {
    height: 1.25em;
  }

  .line.highlighted {
    background: var(--hl-highlight-bg);
  }

  /* Syntax highlighting classes */
  :global(.hl-keyword) {
    color: var(--hl-keyword);
    font-weight: 500;
  }

  :global(.hl-func) {
    color: var(--hl-func);
  }

  :global(.hl-opcode) {
    color: var(--hl-opcode);
    font-weight: 500;
  }

  :global(.hl-register) {
    color: var(--hl-register);
  }

  :global(.hl-constant) {
    color: var(--hl-constant);
  }

  :global(.hl-comment) {
    color: var(--hl-comment);
  }

  :global(.hl-linenum) {
    color: var(--hl-linenum);
  }

  :global(.hl-label) {
    color: var(--hl-label);
    font-weight: 500;
  }

  :global(.hl-number) {
    color: var(--hl-number);
  }

  :global(.hl-block) {
    color: var(--hl-block);
    font-weight: 600;
  }

  :global(.hl-type) {
    color: var(--hl-type);
  }

  :global(.hl-ir-prefix) {
    color: var(--hl-ir-prefix);
  }

  :global(.hl-ir-var) {
    color: var(--hl-ir-var);
  }

  :global(.hl-ir-op) {
    color: var(--hl-ir-op);
    font-weight: 500;
  }

  :global(.hl-ir-args) {
    color: var(--hl-ir-args);
  }

  :global(.hl-asm-op) {
    color: var(--hl-asm-op);
    font-weight: 500;
  }

  :global(.hl-asm-args) {
    color: var(--hl-asm-args);
  }
</style>
