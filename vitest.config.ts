import { defineConfig } from "vitest/config";
import path from "path";

// קונפיג מינימלי ל-vitest - בדיקות יחידה ל-src/lib בלבד (environment node, בלי DOM).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      // תואם ל-paths ב-tsconfig.json: "@/*" -> "./src/*"
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
