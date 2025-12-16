<script lang="ts">
  import { formatTime, isStackTraceLine, formatStackLine, type OutputLine } from '$lib/utils/output';

  interface Props {
    lines: OutputLine[];
    isRunning: boolean;
    executionTime: number | null;
    hasRun: boolean;
  }

  let { lines, isRunning, executionTime, hasRun }: Props = $props();

  let isExpanded = $state(true);

  // Auto-expand when new output arrives
  $effect(() => {
    if (lines.length > 0 || isRunning) {
      isExpanded = true;
    }
  });
</script>

{#if hasRun}
  <div class="luau-embed-output {isExpanded ? 'expanded' : 'collapsed'}">
    <button 
      class="luau-embed-output-header"
      onclick={() => isExpanded = !isExpanded}
    >
      <span class="luau-embed-output-title">
        <span class="luau-embed-output-toggle">▶</span>
        <span>Output</span>
        {#if isRunning}
          <span class="luau-embed-output-indicator"></span>
        {:else if executionTime !== null}
          <span class="luau-embed-output-time">{formatTime(executionTime)}</span>
        {/if}
      </span>
      {#if !isExpanded && lines.length > 0}
        <span class="luau-embed-output-time">
          {lines.length} line{lines.length !== 1 ? 's' : ''}
        </span>
      {/if}
    </button>

    {#if isExpanded}
      <div class="luau-embed-output-content">
        {#if lines.length === 0 && !isRunning}
          <span class="luau-embed-output-empty">No output</span>
        {:else}
          {#each lines as line}
            {@const isStack = line.type === 'error' && isStackTraceLine(line.text)}
            <div class="luau-embed-output-line {line.type} {isStack ? 'stack' : ''}">
              {isStack ? formatStackLine(line.text) : line.text}
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/if}

