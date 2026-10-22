import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Each file still gets its own context, but jsdom is created once per worker instead of per file.
    pool: "vmThreads",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
