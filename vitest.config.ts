import { defineConfig } from "vitest/config";

// Umbral de 90%, el mismo de mistorias-web (ADR 0005), con los thresholds de
// vitest: `pnpm test:coverage` falla si la cobertura baja de ahí. Los puntos
// de entrada de `src/cli/` solo leen el entorno y llaman a un job: se prueban
// los jobs.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // El código llega en los PRs siguientes del stack; hasta entonces no hay
    // tests que correr y la CI no debe fallar por eso.
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/cli/**"],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
