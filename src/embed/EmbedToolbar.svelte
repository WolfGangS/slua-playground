<script lang="ts">
  interface Props {
    isRunning: boolean;
    isLoading: boolean;
    onRun: () => void;
    onCheck: () => void;
    onOpenPlayground: () => void;
  }

  let { isRunning, isLoading, onRun, onCheck, onOpenPlayground }: Props = $props();

  const disabled = $derived(isRunning || isLoading);
</script>

<div class="luau-embed-toolbar">
  <button
    class="luau-embed-btn primary"
    onclick={onRun}
    disabled={disabled}
    title="Run code"
  >
    {#if isRunning}
      <span class="luau-embed-spinner" style="width: 12px; height: 12px; border-width: 1.5px;"></span>
    {:else}
      ▶
    {/if}
  </button>

  <button
    class="luau-embed-btn"
    onclick={onCheck}
    disabled={disabled}
    title="Type check"
  >
    ✓
  </button>

  <div class="luau-embed-separator"></div>

  <button
    class="luau-embed-btn"
    onclick={onOpenPlayground}
    title="Open in playground"
  >
    ↗
  </button>
</div>

