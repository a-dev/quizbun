import { defaultExclude, defineConfig, defineProject } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

import { sharedViteConfig } from "./vite.shared";

// Unit lane — `.spec.ts`, pure logic, Node environment. Co-located in `src/`
// (and `.storybook/`). Resolves through the same Vite aliases as the app so
// `@`/`#styles` imports behave identically in tests and production.
const unitProject = defineProject({
  resolve: sharedViteConfig.resolve,
  test: {
    name: "unit",
    environment: "node",
    include: ["src/**/*.spec.ts", ".storybook/**/*.spec.ts"],
    exclude: [...defaultExclude],
  },
});

// Component lane — `.test.{ts,tsx}`, real-browser rendering (Chromium driven by
// Playwright) for `src/shared/ui` and other islands. Co-located with the
// component. TSX is transformed by Vitest's esbuild (automatic JSX runtime via
// tsconfig); `vitest-browser-react` provides the render integration.
const browserProject = defineProject({
  resolve: sharedViteConfig.resolve,
  css: sharedViteConfig.css,
  optimizeDeps: {
    exclude: ["vitest-browser-react"],
    // `react/jsx-runtime` ships as CJS; pre-bundle it (and the dev variant) so
    // esbuild's automatic-runtime `import { jsx }` resolves to a named export.
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "lucide-react",
      "zod",
      "marked",
      "sanitize-html",
      "htmlparser2",
      "domhandler",
      "dom-serializer",
      // Base UI submodules used by `src/shared/ui`. Pre-bundling every entry the
      // component tests touch keeps the dep graph stable, so a cold run never
      // re-optimizes mid-test (which transiently resolves React to `null`).
      "@base-ui/react",
      "@base-ui/react/button",
      "@base-ui/react/input",
      "@base-ui/react/progress",
      "@base-ui/react/radio",
      "@base-ui/react/radio-group",
      "@base-ui/react/checkbox",
      "@base-ui/react/checkbox-group",
      "@base-ui/react/select",
      "@base-ui/react/combobox",
      "@base-ui/react/toggle",
      "@base-ui/react/toggle-group",
    ],
  },
  test: {
    name: "browser",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [...defaultExclude],
    setupFiles: ["./vitest.browser-setup.ts"],
    globals: true,
    testTimeout: 2000,
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
    browser: {
      enabled: true,
      provider: playwright() as any,
      instances: [{ browser: "chromium" }],
    },
  },
});

export default defineConfig({
  resolve: sharedViteConfig.resolve,
  test: {
    projects: [unitProject, browserProject],
  },
});
