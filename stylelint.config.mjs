/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard", "stylelint-config-clean-order/error"],
  ignoreFiles: ["dist/**", ".astro/**", "storybook-static/**"],
  rules: {
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global"],
      },
    ],
    "property-no-unknown": [
      true,
      {
        ignoreProperties: ["composes"],
      },
    ],
    "custom-property-pattern": [
      "^_?([a-z][a-z0-9]*)(-[a-z0-9]+)*$",
      {
        message: (name) =>
          `Expected custom property name "${name}" to be kebab-case, optionally prefixed with "_" for private component properties`,
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.astro"],
      customSyntax: "postcss-html",
    },
  ],
};
