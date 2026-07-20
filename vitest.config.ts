import { defineConfig } from "vitest/config";

// Separate from vite.config.ts: the Cloudflare Workers plugin there sets
// Worker-environment options (e.g. resolve.external) that are incompatible
// with Vitest's plain Node test environment.
export default defineConfig({
  test: {
    environment: "node",
  },
});
