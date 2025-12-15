<script lang="ts">
  import TabBar from '$lib/components/TabBar.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import Output from '$lib/components/Output.svelte';
  import { initTheme } from '$lib/utils/theme';
  import { initShare } from '$lib/utils/share';
  import { loadLuauWasm } from '$lib/luau/wasm';
  import { initLuauTextMate } from '$lib/editor/textmate';

  let mounted = $state(false);

  // Initialize on mount
  $effect(() => {
    if (!mounted) {
      mounted = true;
      initTheme();
      initShare();
      // Preload TextMate grammar and WASM module in parallel
      Promise.all([
        initLuauTextMate(),
        loadLuauWasm(),
      ]).catch(console.error);
    }
  });
</script>

<div class="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
  <TabBar />
  
  <main class="flex-1 flex flex-col min-h-0 overflow-hidden">
    <!-- Editor takes remaining space -->
    <div class="flex-1 min-h-0 overflow-hidden">
      <Editor />
    </div>
    
    <!-- Output panel -->
    <Output />
  </main>
</div>

<style>
  /* Ensure the app fills the viewport on mobile */
  :global(html), :global(body), :global(#app) {
    height: 100%;
    overflow: hidden;
  }
  
  /* iOS safe area support */
  @supports (padding-top: env(safe-area-inset-top)) {
    :global(body) {
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
  }
</style>
