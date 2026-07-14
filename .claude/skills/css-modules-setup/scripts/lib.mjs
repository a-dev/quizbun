// Shared helpers for the CSS Modules harness scripts. Setup bundles this file
// into projects beside the checker scripts, so it must import nothing outside
// this directory and node built-ins.

import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const SKIPPED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "test-results",
]);

const PROFILE_ROOT_KEYS = new Set([
  "$schema",
  "methodologyVersion",
  "profileSchemaVersion",
  "adapter",
  "appRoot",
  "stylesRoot",
  "globalStylesheet",
  "alias",
  "helpers",
  "sharedApi",
  "layers",
  "composition",
  "colorTokens",
  "commands",
  "runtimeVerification",
  "enforcement",
  "exceptions",
  "extensions",
]);

export async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export function resolveInside(root, relativePath) {
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes the project root: ${relativePath}`);
  }

  return resolved;
}

export async function walk(directory, predicate, output = []) {
  if (!(await exists(directory))) return output;
  const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  for (const entry of entries) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(entryPath, predicate, output);
    else if (predicate(entryPath)) output.push(entryPath);
  }
  return output;
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function globToRegExp(glob) {
  const normalized = glob.split(path.sep).join("/");
  let pattern = "^";

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === "*" && normalized[index + 1] === "*") {
      if (normalized[index + 2] === "/") {
        pattern += "(?:.*/)?";
        index += 2;
      } else {
        pattern += ".*";
        index += 1;
      }
    } else if (character === "*") pattern += "[^/]*";
    else if (character === "?") pattern += "[^/]";
    else pattern += escapeRegExp(character);
  }

  return new RegExp(`${pattern}$`);
}

export function matchesGlob(filePath, glob) {
  return globToRegExp(glob).test(filePath.split(path.sep).join("/"));
}

export function validateProfile(profile) {
  const errors = [];
  const requireString = (value, key) => {
    if (typeof value !== "string" || value.length === 0) {
      errors.push(`${key} must be a non-empty string`);
    }
  };

  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return ["profile must be a JSON object"];
  }

  for (const key of Object.keys(profile)) {
    if (!PROFILE_ROOT_KEYS.has(key)) {
      errors.push(`unknown profile field: ${key}`);
    }
  }

  requireString(profile.methodologyVersion, "methodologyVersion");
  if (
    typeof profile.methodologyVersion === "string" &&
    !/^\d+\.\d+\.\d+$/.test(profile.methodologyVersion)
  ) {
    errors.push("methodologyVersion must use major.minor.patch");
  }

  if (!Number.isInteger(profile.profileSchemaVersion) || profile.profileSchemaVersion < 1) {
    errors.push("profileSchemaVersion must be a positive integer");
  }

  requireString(profile?.adapter?.name, "adapter.name");
  requireString(profile?.adapter?.version, "adapter.version");
  if (
    typeof profile?.adapter?.version === "string" &&
    !/^\d+\.\d+\.\d+$/.test(profile.adapter.version)
  ) {
    errors.push("adapter.version must use major.minor.patch");
  }
  requireString(profile.appRoot, "appRoot");
  requireString(profile.stylesRoot, "stylesRoot");
  requireString(profile.globalStylesheet, "globalStylesheet");
  requireString(profile?.alias?.bare, "alias.bare");
  requireString(profile?.alias?.subpath, "alias.subpath");
  requireString(profile?.helpers?.classNames, "helpers.classNames");
  requireString(profile?.helpers?.cssVariables, "helpers.cssVariables");
  requireString(profile?.sharedApi?.entryPoint, "sharedApi.entryPoint");

  if (!Array.isArray(profile?.sharedApi?.modules) || profile.sharedApi.modules.length === 0) {
    errors.push("sharedApi.modules must contain at least one module");
  }

  const order = profile?.layers?.order;
  if (!Array.isArray(order) || order.length === 0) {
    errors.push("layers.order must contain at least one layer");
  } else if (new Set(order).size !== order.length) {
    errors.push("layers.order must not contain duplicates");
  }

  for (const [index, module] of (profile?.sharedApi?.modules ?? []).entries()) {
    requireString(module?.name, `sharedApi.modules[${index}].name`);
    requireString(module?.path, `sharedApi.modules[${index}].path`);
    requireString(module?.layer, `sharedApi.modules[${index}].layer`);
    if (
      module?.publicClasses !== undefined &&
      (!Array.isArray(module.publicClasses) ||
        module.publicClasses.some(
          (className) => typeof className !== "string" || className.length === 0,
        ) ||
        new Set(module.publicClasses).size !== module.publicClasses.length)
    ) {
      errors.push(
        `sharedApi.modules[${index}].publicClasses must contain unique non-empty strings`,
      );
    }

    if (Array.isArray(order) && !order.includes(module?.layer)) {
      errors.push(`sharedApi.modules[${index}].layer is absent from layers.order`);
    }
  }

  const moduleNames = (profile?.sharedApi?.modules ?? []).map(({ name }) => name);
  const modulePaths = (profile?.sharedApi?.modules ?? []).map(({ path: modulePath }) => modulePath);
  if (new Set(moduleNames).size !== moduleNames.length) {
    errors.push("sharedApi.modules names must be unique");
  }
  if (new Set(modulePaths).size !== modulePaths.length) {
    errors.push("sharedApi.modules paths must be unique");
  }

  for (const [index, owner] of (profile?.layers?.ownership ?? []).entries()) {
    requireString(owner?.glob, `layers.ownership[${index}].glob`);
    requireString(owner?.layer, `layers.ownership[${index}].layer`);

    if (Array.isArray(order) && !order.includes(owner?.layer)) {
      errors.push(`layers.ownership[${index}].layer is absent from layers.order`);
    }
    if (
      typeof owner?.glob === "string" &&
      (path.isAbsolute(owner.glob) || owner.glob.split(/[\\/]/).includes(".."))
    ) {
      errors.push(`layers.ownership[${index}].glob must stay inside the project root`);
    }
  }

  if (!Array.isArray(profile?.layers?.ownership)) {
    errors.push("layers.ownership must be an array");
  }

  const localStrategies = new Set(["unlayered", "profiled", "custom"]);
  if (!localStrategies.has(profile?.layers?.localModules?.strategy)) {
    errors.push("layers.localModules.strategy is invalid");
  }
  if (
    profile?.layers?.localModules?.strategy === "profiled" &&
    !profile.layers.localModules.layer
  ) {
    errors.push("profiled local modules require a layer");
  }
  if (
    profile?.layers?.localModules?.strategy === "custom" &&
    !profile.layers.localModules.document
  ) {
    errors.push("custom local modules require a document");
  }

  const admissionStrategies = new Set(["project-review", "second-semantic-consumer", "explicit"]);
  if (!admissionStrategies.has(profile?.sharedApi?.admissionRule?.strategy)) {
    errors.push("sharedApi.admissionRule.strategy is invalid");
  }

  if (
    profile?.sharedApi?.admissionRule?.strategy === "explicit" &&
    !profile.sharedApi.admissionRule.document
  ) {
    errors.push("explicit shared admission requires a document");
  }

  const compositionModes = new Set(["markup", "composes", "mixed-with-rule"]);
  if (!compositionModes.has(profile?.composition?.mode)) {
    errors.push("composition.mode is invalid");
  }
  if (profile?.composition?.mode === "mixed-with-rule" && !profile.composition.rule) {
    errors.push("mixed composition requires a rule");
  }

  if (typeof profile?.colorTokens?.enabled !== "boolean") {
    errors.push("colorTokens.enabled must be boolean");
  }

  if (profile?.colorTokens?.enabled) {
    if (
      !Array.isArray(profile.colorTokens.paletteFiles) ||
      profile.colorTokens.paletteFiles.length === 0
    ) {
      errors.push("enabled colorTokens requires at least one palette file");
    }
    if (
      !Array.isArray(profile.colorTokens.semanticFiles) ||
      profile.colorTokens.semanticFiles.length === 0
    ) {
      errors.push("enabled colorTokens requires at least one semantic file");
    }
    requireString(profile.colorTokens.themeOwner, "colorTokens.themeOwner");
    requireString(profile.colorTokens.themeAttribute, "colorTokens.themeAttribute");
    if (!Array.isArray(profile.colorTokens.modes) || profile.colorTokens.modes.length === 0) {
      errors.push("enabled colorTokens requires at least one mode");
    }
  }

  if (
    !profile.commands ||
    typeof profile.commands !== "object" ||
    Array.isArray(profile.commands)
  ) {
    errors.push("commands must be an object");
  } else {
    const cssCommandKeys = new Set(["css:generate", "css:types", "css:check", "css:verify"]);
    for (const key of Object.keys(profile.commands)) {
      if (!cssCommandKeys.has(key)) {
        errors.push(`commands.${key} is not a CSS harness command`);
      }
    }
    requireString(profile.commands["css:generate"], 'commands["css:generate"]');
    requireString(profile.commands["css:types"], 'commands["css:types"]');
  }

  if (profile.enforcement !== undefined) {
    if (
      !profile.enforcement ||
      typeof profile.enforcement !== "object" ||
      Array.isArray(profile.enforcement)
    ) {
      errors.push("enforcement must be an object");
    } else {
      if (!new Set(["warning", "error"]).has(profile.enforcement.severity)) {
        errors.push("enforcement.severity must be warning or error");
      }
      if (
        profile.enforcement.privateBooleanAttributes !== undefined &&
        (!Array.isArray(profile.enforcement.privateBooleanAttributes) ||
          profile.enforcement.privateBooleanAttributes.some(
            (attribute) => typeof attribute !== "string" || !attribute.startsWith("data-"),
          ))
      ) {
        errors.push("enforcement.privateBooleanAttributes must contain data-* names");
      }
      for (const [index, module] of (profile.sharedApi?.modules ?? []).entries()) {
        if (!Array.isArray(module.publicClasses)) {
          errors.push(`enforcement requires sharedApi.modules[${index}].publicClasses`);
        }
      }
    }
  }

  if (profile.exceptions !== undefined && !Array.isArray(profile.exceptions)) {
    errors.push("exceptions must be an array");
  }
  for (const [index, exception] of (Array.isArray(profile.exceptions)
    ? profile.exceptions
    : []
  ).entries()) {
    requireString(exception?.kind, `exceptions[${index}].kind`);
    requireString(exception?.scope, `exceptions[${index}].scope`);
    requireString(exception?.reason, `exceptions[${index}].reason`);
    if (exception?.kind === "rule") {
      requireString(exception.rule, `exceptions[${index}].rule`);
      if (exception.match !== undefined)
        requireString(exception.match, `exceptions[${index}].match`);
    }
  }

  if ("spacing" in profile || "sizeScale" in profile) {
    errors.push("generic profiles must not define spacing or sizeScale fields");
  }

  return errors;
}

export async function readProfile(root, profilePath) {
  const profile = await readJson(resolveInside(root, profilePath));
  const errors = validateProfile(profile);
  if (errors.length > 0) throw new Error(`Invalid CSS Modules profile: ${errors.join("; ")}`);
  return profile;
}

export function selectSeverity(profile, override) {
  const severity = override ?? profile.enforcement?.severity ?? "error";
  if (!["warning", "error"].includes(severity)) {
    throw new Error("severity must be warning or error");
  }
  return severity;
}

export function matchesException(finding, exception) {
  return (
    exception.kind === "rule" &&
    exception.rule === finding.ruleId &&
    matchesGlob(finding.file, exception.scope) &&
    (!exception.match || finding.message.includes(exception.match))
  );
}

export function finalizeFindings(rawFindings, exceptions = []) {
  const sorted = [...rawFindings].sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.column - right.column ||
      left.ruleId.localeCompare(right.ruleId),
  );
  const findings = [];
  const suppressed = [];
  for (const item of sorted) {
    const exception = exceptions.find((candidate) => matchesException(item, candidate));
    if (exception) suppressed.push({ finding: item, exception });
    else findings.push(item);
  }
  const status = findings.some(({ severity }) => severity === "error")
    ? "failed"
    : findings.length > 0
      ? "warnings"
      : "passed";
  return { findings, suppressed, status };
}

export function exitCodeForFindings(result) {
  return result.status === "failed" ? 1 : 0;
}

export function formatFindingsReport(result, title) {
  const lines = [`${title}: ${result.root}`, ""];
  for (const item of result.findings) {
    lines.push(
      `${item.severity.toUpperCase()} ${item.file}:${item.line}:${item.column} ${item.ruleId} ${item.message}`,
    );
  }
  if (result.findings.length === 0) lines.push("No violations.");
  if (result.suppressed.length > 0)
    lines.push("", `Suppressed by documented exceptions: ${result.suppressed.length}`);
  lines.push("", `Result: ${result.status}`);
  return lines.join("\n");
}
