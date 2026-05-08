import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "es2020",
    outDir: "docs",
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          openscad: ["openscad-wasm"],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["openscad-wasm"],
  },
});