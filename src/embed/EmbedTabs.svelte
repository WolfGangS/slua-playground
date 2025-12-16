<script lang="ts">
  interface Props {
    files: Record<string, string>;
    activeFile: string;
    onSelectFile: (name: string) => void;
  }

  let { files, activeFile, onSelectFile }: Props = $props();

  const fileNames = $derived(Object.keys(files));
  const showTabs = $derived(fileNames.length > 1);
</script>

{#if showTabs}
  <div class="luau-embed-tabs">
    {#each fileNames as fileName}
      <button
        class="luau-embed-tab {activeFile === fileName ? 'active' : ''}"
        onclick={() => onSelectFile(fileName)}
      >
        {fileName}
      </button>
    {/each}
  </div>
{:else if fileNames.length === 1}
  <div class="luau-embed-tabs">
    <span class="luau-embed-tab active" style="cursor: default;">
      {fileNames[0]}
    </span>
  </div>
{/if}

