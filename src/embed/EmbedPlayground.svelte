<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import EmbedTabs from './EmbedTabs.svelte';
  import EmbedToolbar from './EmbedToolbar.svelte';
  import EmbedOutput from './EmbedOutput.svelte';
  import { createEmbedEditor, type EmbedEditor, type Theme } from './editor';
  import { runWithModules, checkWithModules, isLoaded } from './wasm';
  import { openInPlayground } from './share';
  import type { OutputLine } from '$lib/utils/output';

  interface Props {
    files: Record<string, string>;
    activeFile: string;
    readonly?: boolean;
    theme?: Theme;
    height?: string;
  }

  let { 
    files: propFiles, 
    activeFile: propActiveFile, 
    readonly = false, 
    theme = 'auto',
    height = '300px' 
  }: Props = $props();
  
  // Copy initial values on mount (intentionally not reactive to prop changes)
  // The embed captures the initial state and allows editing from there
  let files = $state<Record<string, string>>({});
  let activeFile = $state('');
  
  // Initialize from props on first render
  $effect(() => {
    // Only initialize once when propFiles is available
    if (Object.keys(files).length === 0 && propFiles && Object.keys(propFiles).length > 0) {
      files = { ...propFiles };
      activeFile = propActiveFile || Object.keys(propFiles)[0] || 'main.luau';
    }
  });
  let output = $state<OutputLine[]>([]);
  let isRunning = $state(false);
  let isLoading = $state(false);
  let executionTime = $state<number | null>(null);
  let hasRun = $state(false);

  // Editor
  let editorContainer: HTMLDivElement;
  let editor: EmbedEditor | null = null;

  onMount(() => {
    editor = createEmbedEditor({
      container: editorContainer,
      content: files[activeFile] || '',
      readonly,
      theme,
      onChange: (content) => {
        files[activeFile] = content;
      },
    });
  });

  onDestroy(() => {
    editor?.destroy();
  });

  // Switch files
  function selectFile(name: string) {
    if (name === activeFile) return;
    
    // Save current content
    if (editor) {
      files[activeFile] = editor.getContent();
    }
    
    // Switch to new file
    activeFile = name;
    
    // Update editor content
    if (editor) {
      editor.setContent(files[name] || '');
    }
  }

  // Run code
  async function handleRun() {
    if (isRunning) return;
    
    // Save current content
    if (editor) {
      files[activeFile] = editor.getContent();
    }
    
    isRunning = true;
    isLoading = !isLoaded();
    output = [];
    executionTime = null;
    hasRun = true;
    
    output = [{ type: 'log', text: `Running ${activeFile}...` }];
    
    try {
      const { result, elapsed } = await runWithModules(files, activeFile);
      executionTime = elapsed;
      
      const newOutput: OutputLine[] = [];
      
      if (result.output) {
        result.output.split('\n').forEach((line) => {
          newOutput.push({ type: 'log', text: line });
        });
      }
      
      if (!result.success && result.error) {
        result.error.split('\n').forEach((line) => {
          newOutput.push({ type: 'error', text: line });
        });
      }
      
      output = newOutput;
    } catch (error) {
      output = [{
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      }];
    } finally {
      isRunning = false;
      isLoading = false;
    }
  }

  // Check code
  async function handleCheck() {
    if (isRunning) return;
    
    // Save current content
    if (editor) {
      files[activeFile] = editor.getContent();
    }
    
    isRunning = true;
    isLoading = !isLoaded();
    output = [];
    executionTime = null;
    hasRun = true;
    
    output = [{ type: 'log', text: `Type checking ${activeFile}...` }];
    
    try {
      const { diagnostics, elapsed } = await checkWithModules(files, activeFile);
      executionTime = elapsed;
      
      if (diagnostics.length === 0) {
        output = [{ type: 'log', text: '✓ No type errors found' }];
      } else {
        const errorCount = diagnostics.filter(d => d.severity === 'error').length;
        const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
        
        const summary = [];
        if (errorCount > 0) summary.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
        if (warningCount > 0) summary.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
        
        const newOutput: OutputLine[] = [
          { type: 'log', text: `Found ${summary.join(', ')}:` },
          { type: 'log', text: '' },
        ];
        
        for (const diag of diagnostics) {
          const location = `${activeFile}:${diag.startLine + 1}:${diag.startCol + 1}`;
          const type = diag.severity === 'error' ? 'error' : diag.severity === 'warning' ? 'warn' : 'log';
          newOutput.push({ type, text: `${location}: ${diag.message}` });
        }
        
        output = newOutput;
      }
    } catch (error) {
      output = [{
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      }];
    } finally {
      isRunning = false;
      isLoading = false;
    }
  }

  // Open in playground
  function handleOpenPlayground() {
    // Save current content
    if (editor) {
      files[activeFile] = editor.getContent();
    }
    
    openInPlayground(files, activeFile);
  }
</script>

<div class="luau-embed-container">
  <!-- Header -->
  <div class="luau-embed-header">
    <EmbedTabs 
      {files} 
      {activeFile} 
      onSelectFile={selectFile} 
    />
    <EmbedToolbar
      {isRunning}
      {isLoading}
      onRun={handleRun}
      onCheck={handleCheck}
      onOpenPlayground={handleOpenPlayground}
    />
  </div>

  <!-- Editor -->
  <div 
    class="luau-embed-editor" 
    style="height: {height};"
    bind:this={editorContainer}
  ></div>

  <!-- Output -->
  <EmbedOutput
    lines={output}
    {isRunning}
    {executionTime}
    {hasRun}
  />
</div>

