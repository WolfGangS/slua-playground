/**
 * Luau Embed - Custom Elements Entry Point
 * 
 * Registers <luau-embed> and <luau-file> custom elements for embedding
 * Luau playgrounds in documentation sites.
 */

import { mount } from 'svelte';
import EmbedPlayground from './EmbedPlayground.svelte';
import embedStyles from './styles.css?inline';

/**
 * <luau-file> - Defines a file within a <luau-embed>
 * 
 * Attributes:
 * - name: File name (e.g., "main.luau")
 * 
 * Content: Raw Luau code as text content
 */
class LuauFile extends HTMLElement {
  static get observedAttributes() {
    return ['name'];
  }
  
  get name(): string {
    return this.getAttribute('name') || 'main.luau';
  }
  
  get code(): string {
    return this.textContent?.trim() || '';
  }
}

/**
 * <luau-embed> - Container for embeddable Luau playground
 * 
 * Attributes:
 * - active: Initially active file (defaults to first file)
 * - readonly: Disable editing
 * - theme: "light" | "dark" | "auto" (defaults to "auto")
 * - height: Editor height (defaults to "300px")
 */
class LuauEmbed extends HTMLElement {
  private component: ReturnType<typeof mount> | null = null;
  private shadowRoot_: ShadowRoot | null = null;
  
  static get observedAttributes() {
    return ['active', 'readonly', 'theme', 'height'];
  }
  
  connectedCallback() {
    // Parse <luau-file> children to extract files
    const files = this.parseFiles();
    
    // Get attributes
    const active = this.getAttribute('active') || Object.keys(files)[0] || 'main.luau';
    const readonly = this.hasAttribute('readonly');
    const theme = (this.getAttribute('theme') as 'light' | 'dark' | 'auto') || 'auto';
    const height = this.getAttribute('height') || '300px';
    
    // Create Shadow DOM for style isolation
    this.shadowRoot_ = this.attachShadow({ mode: 'open' });
    
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = embedStyles;
    this.shadowRoot_.appendChild(styleEl);
    
    // Create mount point
    const container = document.createElement('div');
    container.className = 'luau-embed-container';
    this.shadowRoot_.appendChild(container);
    
    // Mount Svelte component
    this.component = mount(EmbedPlayground, {
      target: container,
      props: {
        files,
        activeFile: active,
        readonly,
        theme,
        height,
      },
    });
    
    // Hide the original content (the <luau-file> elements)
    this.style.display = 'contents';
  }
  
  disconnectedCallback() {
    // Svelte 5 mount doesn't return an unmount function directly
    // The component will be cleaned up when the shadow DOM is removed
    this.component = null;
  }
  
  private parseFiles(): Record<string, string> {
    const fileElements = this.querySelectorAll('luau-file');
    const files: Record<string, string> = {};
    
    fileElements.forEach((el) => {
      const name = el.getAttribute('name') || 'main.luau';
      // Get the text content, trimming leading/trailing whitespace
      const code = el.textContent?.trim() || '';
      files[name] = code;
    });
    
    // If no files were found, create a default empty file
    if (Object.keys(files).length === 0) {
      files['main.luau'] = '-- Write your Luau code here\n';
    }
    
    return files;
  }
}

// Register custom elements
if (!customElements.get('luau-file')) {
  customElements.define('luau-file', LuauFile);
}

if (!customElements.get('luau-embed')) {
  customElements.define('luau-embed', LuauEmbed);
}

export { LuauEmbed, LuauFile };

