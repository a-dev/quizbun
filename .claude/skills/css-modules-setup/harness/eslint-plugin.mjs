function ruleMeta(messages) {
  return {
    type: "problem",
    docs: { description: "Enforce the typed CSS Modules project contract." },
    schema: [],
    messages,
  };
}

function settings(context) {
  return context.settings?.cssModules ?? {};
}

function jsxName(attribute) {
  return attribute.type === "JSXAttribute" && attribute.name.type === "JSXIdentifier"
    ? attribute.name.name
    : undefined;
}

function expressionOf(attribute) {
  return attribute.value?.type === "JSXExpressionContainer"
    ? attribute.value.expression
    : attribute.value;
}

function memberBelongsTo(node, identifiers) {
  return (
    node?.type === "MemberExpression" &&
    node.object?.type === "Identifier" &&
    identifiers.has(node.object.name)
  );
}

function cssModuleTracker(visitor) {
  const identifiers = new Set();
  return {
    ImportDeclaration(node) {
      if (!node.source.value.endsWith(".module.css")) return;
      for (const specifier of node.specifiers) {
        if (specifier.type === "ImportDefaultSpecifier") identifiers.add(specifier.local.name);
      }
    },
    ...visitor(identifiers),
  };
}

const noComputedKey = {
  meta: ruleMeta({
    computed: "Use an exhaustive typed lookup instead of a computed CSS Module key.",
  }),
  create(context) {
    return cssModuleTracker((identifiers) => ({
      MemberExpression(node) {
        if (node.computed && memberBelongsTo(node, identifiers)) {
          context.report({ node, messageId: "computed" });
        }
      },
    }));
  },
};

const noBooleanStateClass = {
  meta: ruleMeta({
    conditional:
      "Expose boolean state through its native, ARIA, library, or presence-based data attribute instead of a conditional CSS Module class.",
  }),
  create(context) {
    return cssModuleTracker((identifiers) => ({
      CallExpression(node) {
        const helper = settings(context).classNamesHelper ?? "cx";
        if (node.callee.type !== "Identifier" || node.callee.name !== helper) return;
        for (const argument of node.arguments) {
          if (
            argument.type === "LogicalExpression" &&
            argument.operator === "&&" &&
            memberBelongsTo(argument.right, identifiers)
          ) {
            context.report({ node: argument, messageId: "conditional" });
          }
        }
      },
    }));
  },
};

function propertyName(property) {
  if (property.type !== "ObjectProperty" && property.type !== "Property") return undefined;
  if (property.computed) return undefined;
  if (property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "StringLiteral" || property.key.type === "Literal")
    return property.key.value;
  return undefined;
}

const customPropertyStyleOnly = {
  meta: ruleMeta({
    property:
      "Move the visual style {{name}} to CSS; application-owned runtime values must use the configured custom-property helper.",
    expression:
      "Move {{expression}} to CSS or record a narrow integration exception for this library-owned style object.",
  }),
  create(context) {
    return {
      JSXAttribute(node) {
        if (jsxName(node) !== "style") return;
        const expression = expressionOf(node);
        const helper = settings(context).cssVariablesHelper ?? "cssVars";
        if (
          expression?.type === "CallExpression" &&
          expression.callee.type === "Identifier" &&
          expression.callee.name === helper
        ) {
          return;
        }
        if (expression?.type !== "ObjectExpression") {
          context.report({
            node: expression ?? node,
            messageId: "expression",
            data: {
              expression: expression ? context.sourceCode.getText(expression) : "this visual style",
            },
          });
          return;
        }
        for (const property of expression.properties) {
          const name = propertyName(property);
          if (typeof name !== "string" || !name.startsWith("--_")) {
            context.report({
              node: property,
              messageId: "property",
              data: { name: typeof name === "string" ? `"${name}"` : "entry" },
            });
          }
        }
      },
    };
  },
};

const DUPLICATE_STATE = new Map([
  ["data-disabled", ["disabled", "aria-disabled"]],
  ["data-checked", ["checked", "aria-checked"]],
  ["data-selected", ["aria-selected"]],
  ["data-expanded", ["aria-expanded"]],
  ["data-pressed", ["aria-pressed"]],
  ["data-invalid", ["aria-invalid"]],
]);

const noDuplicateState = {
  meta: ruleMeta({
    duplicate: "Style {{semantic}} directly; {{privateState}} duplicates the same semantic state.",
  }),
  create(context) {
    return {
      JSXOpeningElement(node) {
        const attributes = new Map(
          node.attributes
            .map((attribute) => [jsxName(attribute), attribute])
            .filter(([name]) => name),
        );
        for (const [privateState, semanticSources] of DUPLICATE_STATE) {
          if (!attributes.has(privateState)) continue;
          const semantic = semanticSources.find((name) => attributes.has(name));
          if (semantic) {
            context.report({
              node: attributes.get(privateState),
              messageId: "duplicate",
              data: { privateState, semantic },
            });
          }
        }
      },
    };
  },
};

function isUndefinedLike(node) {
  return (
    (node?.type === "Identifier" && node.name === "undefined") ||
    node?.type === "NullLiteral" ||
    (node?.type === "Literal" && node.value === null)
  );
}

function isPresenceExpression(node) {
  return (
    (node?.type === "LogicalExpression" &&
      ["||", "??"].includes(node.operator) &&
      isUndefinedLike(node.right)) ||
    (node?.type === "ConditionalExpression" &&
      (isUndefinedLike(node.consequent) || isUndefinedLike(node.alternate)))
  );
}

const dataBooleanPresence = {
  meta: ruleMeta({
    presence:
      "Render {{name}} as a presence attribute: omit it when false instead of serializing a boolean value.",
  }),
  create(context) {
    return {
      JSXAttribute(node) {
        const name = jsxName(node);
        const configured = settings(context).privateBooleanAttributes ?? ["data-loading"];
        if (!name || !configured.includes(name)) return;
        if (!isPresenceExpression(expressionOf(node))) {
          context.report({ node, messageId: "presence", data: { name } });
        }
      },
    };
  },
};

export const eslintRuleIds = [
  "no-computed-key",
  "no-boolean-state-class",
  "custom-property-style-only",
  "no-duplicate-state",
  "data-boolean-presence",
];

export default {
  meta: { name: "eslint-plugin-css-modules-contract", version: "1.0.0" },
  rules: {
    "no-computed-key": noComputedKey,
    "no-boolean-state-class": noBooleanStateClass,
    "custom-property-style-only": customPropertyStyleOnly,
    "no-duplicate-state": noDuplicateState,
    "data-boolean-presence": dataBooleanPresence,
  },
};
