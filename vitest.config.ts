import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Avoid loading Next/Tailwind PostCSS plugins under Vite.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
