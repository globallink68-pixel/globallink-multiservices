import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { manifest: true },
  server: {
    host: "localhost",
    port: 5175,
    strictPort: true,
    proxy: { "/api": "http://localhost:8012" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    restoreMocks: true,
  },
});
