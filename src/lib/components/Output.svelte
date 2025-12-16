<script lang="ts">
  import { output, isRunning, clearOutput, executionTime } from '$lib/stores/playground';
  import { Button } from '$lib/components/ui/button';

  let isExpanded = $state(true);
  
  function formatTime(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(0)}μs`;
    } else if (ms < 1000) {
      return `${ms.toFixed(1)}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  }

  // Check if a line is part of a stack trace
  function isStackTraceLine(text: string): boolean {
    return text.startsWith('\t') || text.startsWith('stack traceback:');
  }

  // Format stack trace line for display
  function formatStackLine(text: string): string {
    // Clean up the line - remove leading tab, format nicely
    if (text.startsWith('\t')) {
      return text.substring(1); // Remove leading tab
    }
    return text;
  }
</script>

<div 
  class="flex flex-col border-t border-[var(--border-color)] bg-[var(--bg-secondary)] transition-[height] duration-200"
  style="height: {isExpanded ? 'min(200px, 40vh)' : '36px'}"
>
  <!-- Header -->
  <div class="flex items-center justify-between px-2 sm:px-3 py-1.5 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)] shrink-0">
    <button 
      class="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      onclick={() => isExpanded = !isExpanded}
    >
      <span 
        class="text-xs transition-transform duration-200" 
        style="transform: rotate({isExpanded ? 90 : 0}deg)"
      >
        ▶
      </span>
      <span>Output</span>
      {#if $isRunning}
        <span class="animate-pulse text-[var(--accent)]">●</span>
      {:else if $executionTime !== null}
        <span class="text-xs text-[var(--text-muted)] font-mono">
          {formatTime($executionTime)}
        </span>
      {/if}
      {#if !isExpanded && $output.length > 0}
        <span class="text-xs text-[var(--text-muted)]">
          ({$output.length} line{$output.length !== 1 ? 's' : ''})
        </span>
      {/if}
    </button>
    {#if isExpanded && $output.length > 0}
      <Button size="sm" variant="ghost" onclick={clearOutput} class="h-7 px-2">
        Clear
      </Button>
    {/if}
  </div>

  <!-- Content -->
  {#if isExpanded}
    <div class="flex-1 overflow-auto p-2 sm:p-3 font-mono text-xs sm:text-sm min-h-0">
      {#if $output.length === 0}
        <span class="text-[var(--text-muted)] italic">
          Run your code to see output here...
        </span>
      {:else}
        {#each $output as line, i}
          {@const isStack = line.type === 'error' && isStackTraceLine(line.text)}
          <div 
            class="leading-relaxed break-all
              {isStack ? 'pl-4 py-0 opacity-80 text-[var(--color-error-400)]' : 'py-0.5'}
              {line.type === 'error' && !isStack ? 'text-[var(--color-error-500)]' : ''}
              {line.type === 'warn' ? 'text-[var(--color-warning-500)]' : ''}
              {line.type === 'log' ? 'text-[var(--text-primary)]' : ''}"
          >
            {isStack ? formatStackLine(line.text) : line.text}
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
