/// <reference types="vitest" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// No GitHub Pages o app fica em /<repo>/ — o workflow passa em BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        // o "servidor" GraphQL (graphql-js + graphql-tools) vai num chunk próprio, separado do app
        manualChunks(id) {
          if (/node_modules\/(graphql|@graphql-tools)\//.test(id)) return "graphql";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    // graphql publica CJS e ESM; sem isso o Vitest carrega as duas cópias e o graphql reclama de "another realm"
    alias: [{ find: /^graphql$/, replacement: "graphql/index.js" }],
  },
});
