import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
export default defineConfig({
  publicDir: "src-tauri/resources",
  plugins: [vue(), vueJsx()],
  // Hikari ships Vue TSX sources; keep them on the Vue JSX transform path.
  optimizeDeps: {
    exclude: ['@celestia-island/hikari'],
    include: [
      '@celestia-island/hikari > highlight.js/lib/core',
      '@celestia-island/hikari > @xterm/xterm',
      '@celestia-island/hikari > @xterm/addon-fit',
      '@celestia-island/hikari > @xterm/addon-image',
    ],
  },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: { target: ["es2022", "chrome105", "safari15"] },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: [
          "import",
          "global-builtin",
          "color-functions",
          "if-function",
        ],
      },
    },
  },
  test: { environment: "happy-dom", include: ["ui/tests/**/*.test.ts"] },
});
