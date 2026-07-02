import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Unit tests never touch the network/DB; stub server-only guard.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
});
