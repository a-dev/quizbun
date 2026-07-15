import colorNames from "color-name";
import selectorParser from "postcss-selector-parser";
import valueParser from "postcss-value-parser";
import stylelint from "stylelint";

const { report, ruleMessages } = stylelint.utils;
const NAMED_COLORS = new Set(Object.keys(colorNames));

function plugin(ruleName, message, inspect) {
  const messages = ruleMessages(ruleName, { rejected: message });
  const rule =
    (enabled, options = {}) =>
    (root, result) => {
      if (!enabled) return;
      inspect(root, options, (node, detail = message) => {
        report({ ruleName, result, node, message: detail });
      });
    };
  rule.ruleName = ruleName;
  rule.messages = messages;
  rule.meta = { url: `https://github.com/a-dev/skills#${ruleName}` };
  return stylelint.createPlugin(ruleName, rule);
}

function parseSelectors(rule, visit) {
  try {
    selectorParser(visit).processSync(rule.selector);
  } catch {
    // Stylelint reports malformed selectors separately.
  }
}

function enclosingLayer(rule) {
  let current = rule.parent;
  while (current) {
    if (current.type === "atrule" && current.name.toLowerCase() === "layer") {
      return current.params.trim();
    }
    current = current.parent;
  }
  return null;
}

function isGlobalClass(classNode) {
  let current = classNode.parent;
  while (current) {
    if (current.type === "pseudo" && current.value === ":global") return true;
    current = current.parent;
  }
  return false;
}

const plugins = [
  plugin(
    "css-modules/class-pattern",
    "Use kebab-case for authored CSS Module class names.",
    (root, _options, warn) => {
      root.walkRules((rule) => {
        parseSelectors(rule, (selectors) => {
          selectors.walkClasses((classNode) => {
            if (
              !isGlobalClass(classNode) &&
              !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(classNode.value)
            ) {
              warn(rule, `Class .${classNode.value} must use kebab-case.`);
            }
          });
        });
      });
    },
  ),
  plugin(
    "css-modules/no-palette-in-component",
    "Consume semantic color roles in component modules, not primitive palette tokens.",
    (root, options, warn) => {
      const paletteTokens = new Set(options.paletteTokens ?? []);
      root.walkDecls((declaration) => {
        valueParser(declaration.value).walk((node) => {
          if (node.type === "word" && paletteTokens.has(node.value)) {
            warn(declaration, `Palette token ${node.value} is not a component-level color role.`);
          }
        });
      });
    },
  ),
  plugin(
    "css-modules/no-raw-color-in-component",
    "Use a semantic color role instead of an authored raw color.",
    (root, options, warn) => {
      if (!options.colorContractEnabled) return;
      root.walkDecls((declaration) => {
        valueParser(declaration.value).walk((node) => {
          const rawFunction =
            node.type === "function" &&
            /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/i.test(node.value);
          const rawHex = node.type === "word" && /^#[\da-f]{3,8}$/i.test(node.value);
          const rawNamed = node.type === "word" && NAMED_COLORS.has(node.value.toLowerCase());
          if (rawFunction || rawHex || rawNamed) {
            warn(
              declaration,
              `Raw color ${valueParser.stringify(node)} must be routed through a semantic token.`,
            );
          }
        });
      });
    },
  ),
  plugin(
    "css-modules/no-local-theme-selector",
    "Theme selection belongs to the recorded global theme owner.",
    (root, options, warn) => {
      if (!options.themeAttribute) return;
      root.walkRules((rule) => {
        parseSelectors(rule, (selectors) => {
          selectors.walkAttributes((attribute) => {
            if (attribute.attribute === options.themeAttribute) {
              warn(
                rule,
                `Move [${options.themeAttribute}] theme selection to ${options.themeOwner}.`,
              );
            }
          });
        });
      });
    },
  ),
  plugin(
    "css-modules/layer-by-profile",
    "Place the module in the layer selected by the project profile.",
    (root, options, warn) => {
      if (options.expectedLayer === undefined) return;
      root.walkRules((rule) => {
        const actual = enclosingLayer(rule);
        if (actual !== options.expectedLayer) {
          const expected = options.expectedLayer
            ? `@layer ${options.expectedLayer}`
            : "an unlayered rule";
          warn(
            rule,
            `Expected ${expected}; found ${actual ? `@layer ${actual}` : "an unlayered rule"}.`,
          );
        }
      });
    },
  ),
  plugin(
    "css-modules/no-descendant-type",
    "Give authored descendants an owned class instead of selecting their element type.",
    (root, _options, warn) => {
      root.walkRules((rule) => {
        parseSelectors(rule, (selectors) => {
          selectors.each((selector) => {
            let ownedClassSeen = false;
            let relationshipSeen = false;
            selector.each((node) => {
              if (node.type === "class") ownedClassSeen = true;
              if (node.type === "combinator" && ownedClassSeen) relationshipSeen = true;
              if (node.type === "tag" && relationshipSeen) {
                warn(rule, `Descendant type selector ${node.value} needs a local role class.`);
              }
            });
          });
        });
      });
    },
  ),
  plugin(
    "css-modules/no-important",
    "Remove !important or record a narrow, documented integration exception.",
    (root, _options, warn) => {
      root.walkDecls((declaration) => {
        if (declaration.important)
          warn(declaration, `Declaration ${declaration.prop} uses !important.`);
      });
    },
  ),
  plugin(
    "css-modules/state-selector-shape",
    "Use value selectors for meaningful ARIA state and presence selectors for private booleans.",
    (root, options, warn) => {
      const privateBooleans = new Set(options.privateBooleanAttributes ?? []);
      root.walkRules((rule) => {
        parseSelectors(rule, (selectors) => {
          selectors.walkAttributes((attribute) => {
            if (attribute.attribute?.startsWith("aria-") && !attribute.operator) {
              warn(
                rule,
                `[${attribute.attribute}] must select an explicit ARIA value such as "true" or "false".`,
              );
            }
            if (privateBooleans.has(attribute.attribute) && attribute.operator) {
              warn(
                rule,
                `[${attribute.attribute}] is a presence selector; remove the serialized value.`,
              );
            }
          });
        });
      });
    },
  ),
];

export const stylelintRuleIds = plugins.map(({ ruleName }) => ruleName);
export default plugins;
