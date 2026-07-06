import type { StorybookConfig } from "@storybook/react-vite";

// import { dirname } from "path";

// import { fileURLToPath } from "url";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
// function getAbsolutePath(value: string) {
//   return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
// }
const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "./stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  core: {
    builder: {
      name: "@storybook/builder-vite",
      options: {
        viteConfigPath: "vite.storybook.config.ts",
      },
    },
  },
  addons: ["storybook-dark-mode"],
  // framework: getAbsolutePath("@storybook/react-vite"),
  framework: "@storybook/react-vite",
  staticDirs: ["../tmp"],
};
export default config;
