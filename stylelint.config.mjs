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
    // `color-mix()` defaults to oklab when the colour space is omitted, so a
    // bare mix silently lands off-palette next to the `in oklch` mixes around
    // it. The optional-colour-space syntax is also much newer than
    // `color-mix()` itself, so requiring it costs nothing in support.
    "declaration-property-value-disallowed-list": [
      { "/.*/": [/color-mix\((?!\s*in[\s(])/] },
      {
        message:
          "Expected color-mix() to state a colour-interpolation method, e.g. color-mix(in oklch, ...)",
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
