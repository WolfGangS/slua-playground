<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { files, activeFile, updateFile } from '$lib/stores/playground';
  import { createEditor, destroyEditor, updateEditorContent, getEditorContent } from '$lib/editor/setup';

  let editorContainer: HTMLDivElement;
  let currentFile = $state('');

  onMount(() => {
    createEditor(editorContainer, $files[$activeFile] || '', (content) => {
      if ($activeFile) {
        updateFile($activeFile, content);
      }
    });
  });

  onDestroy(() => {
    destroyEditor();
  });

  // React to active file changes
  $effect(() => {
    const file = $activeFile;
    if (file && file !== currentFile) {
      currentFile = file;
      const content = $files[file] || '';
      updateEditorContent(content);
    }
  });
</script>

<div class="h-full w-full bg-(--bg-editor)" bind:this={editorContainer}></div>

