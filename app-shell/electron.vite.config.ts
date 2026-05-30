import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared')
      }
    }
  },
  renderer: {
    plugins: [svelte({ preprocess: vitePreprocess() })],
    server: {
      port: 5183,
      strictPort: true
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    ssr: {
      // phosphor-svelte must be bundled, not externalized
      noExternal: ['phosphor-svelte']
    }
  }
})
