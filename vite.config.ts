import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: {
    jsx: "automatic",
  },
  test: {
    setupFiles: ["./test/setup-dom.ts"],
    exclude: ["node_modules", "e2e/**"],
  },
});
