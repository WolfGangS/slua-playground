import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Check if we're building the embed component
const isEmbedBuild = process.env.BUILD_EMBED === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte({
      // For embed build, compile Svelte components for custom elements
      compilerOptions: isEmbedBuild ? {
        // Enable custom element mode for components that need it
        customElement: false, // We handle this manually in the wrapper
      } : {},
    }),
    // Only include Tailwind for the main app build
    ...(isEmbedBuild ? [] : [tailwindcss()]),
  ],
  resolve: {
    alias: {
      '$lib': path.resolve(__dirname, './src/lib'),
    },
  },
  build: isEmbedBuild ? {
    // Embed build configuration
    lib: {
      entry: path.resolve(__dirname, 'src/embed/index.ts'),
      name: 'LuauEmbed',
      formats: ['es'],
      fileName: () => 'embed/luau-embed.js',
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't clear dist since main app was built first
    sourcemap: true,
    minify: 'terser', // Enable terser for compact output
    terserOptions: {
      format: {
        comments: false,
      },
      compress: {
        drop_console: false, // Keep console for debugging
      },
    },
    copyPublicDir: false, // Don't copy public assets for embed build
    rollupOptions: {
      // Don't externalize anything - bundle everything for standalone use
      external: [],
      output: {
        // Ensure CSS is inlined (handled via ?inline import)
        inlineDynamicImports: true,
      },
    },
  } : {
    // Main app build configuration
    sourcemap: true,
  },
})
