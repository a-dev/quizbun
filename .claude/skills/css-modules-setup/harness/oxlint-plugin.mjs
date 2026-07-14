import eslintPlugin, { eslintRuleIds } from "./eslint-plugin.mjs";

export const oxlintRuleIds = eslintRuleIds;

export default {
  meta: { name: "css-modules", version: "1.0.0" },
  rules: eslintPlugin.rules,
};
