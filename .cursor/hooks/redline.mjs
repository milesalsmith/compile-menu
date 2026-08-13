#!/usr/bin/env node
/**
 * compile.menu redline — refuse, never repair (rule 000).
 * Plain Node so Cursor's hook process (Node 20) can run it.
 *
 * Scanned surfaces are narrow on purpose. Comments, README, and the fence
 * tests that deliberately contain allergens: ["milk"] are out of scope.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLERGEN_PROP =
  /\b(allergens?|glutenFree|gluten_free|coeliac|celiac)\s*[?:]/;
const BRAND_NAME = /\bnando|\bperi[\s-]?peri/i;

const ENTROPY_REQUIRED = [
  "toBeCloseTo(4.392",
  "toBeCloseTo(2.27",
  "toBeCloseTo(1.63",
  "toBeCloseTo(1.34",
  "MENU.length).toBe(21)",
];

const FLOW_REQUIRED = [
  "exactly 23 terminal identify paths",
  "ASK_COST fires on exactly 1",
];

const SCHEMA_FILES = new Set([
  "src/lib/extraction/schema.ts",
  "src/lib/types.ts",
  "src/lib/menu.ts",
]);

const TREE_FILES = [
  "src/lib/extraction/schema.ts",
  "src/lib/types.ts",
  "src/lib/menu.ts",
  "src/data/demo-menu.ts",
  "src/lib/entropy.test.ts",
  "src/lib/flow.test.ts",
];

const DEPLOY_COMMAND =
  /\bwrangler\s+deploy\b|\bpnpm\s+run\s+deploy\b|\bpnpm\s+deploy\b/;

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function isSchemaSurface(rel) {
  return SCHEMA_FILES.has(rel) || rel.startsWith("worker/");
}

export function repoRel(filePath, cwd = ROOT) {
  const resolved = path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(cwd, filePath);
  return path.relative(cwd, resolved).replaceAll("\\", "/");
}

export function checkContents(relPath, contents) {
  const rel = relPath.replaceAll("\\", "/");

  if (isSchemaSurface(rel) && ALLERGEN_PROP.test(contents)) {
    return {
      path: rel,
      reason:
        "Allergen / gluten-free fields are out of scope (rule 000). The fence rejects them; do not add them to the schema.",
    };
  }

  if (rel === "src/data/demo-menu.ts" && BRAND_NAME.test(contents)) {
    return {
      path: rel,
      reason:
        "The shipped demo dataset stays generic (rule 000.6a). Do not put branded product names in demo-menu.ts.",
    };
  }

  if (rel === "src/lib/entropy.test.ts") {
    const missing = ENTROPY_REQUIRED.filter((s) => !contents.includes(s));
    if (missing.length) {
      return {
        path: rel,
        reason: `Verified-number assertions must stay (rule 010): missing ${missing.join(", ")}.`,
      };
    }
  }

  if (rel === "src/lib/flow.test.ts") {
    const missing = FLOW_REQUIRED.filter((s) => !contents.includes(s));
    if (missing.length) {
      return {
        path: rel,
        reason: `Verified-number assertions must stay (rule 010): missing ${missing.join(", ")}.`,
      };
    }
  }

  return null;
}

function walkTsFiles(dir, acc) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(full, acc);
    else if (entry.isFile() && entry.name.endsWith(".ts")) acc.push(full);
  }
}

export function checkTree(cwd = ROOT) {
  const files = TREE_FILES.map((rel) => path.join(cwd, rel));
  walkTsFiles(path.join(cwd, "worker"), files);

  const seen = new Set();
  const violations = [];
  for (const abs of files) {
    const rel = repoRel(abs, cwd);
    if (seen.has(rel) || !existsSync(abs)) continue;
    seen.add(rel);
    const hit = checkContents(rel, readFileSync(abs, "utf8"));
    if (hit) violations.push(hit);
  }
  return violations;
}

function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toolInputOf(payload) {
  const raw = payload.tool_input;
  return raw !== null && typeof raw === "object" && !Array.isArray(raw)
    ? raw
    : payload;
}

function toolPath(input) {
  return asString(input.path) ?? asString(input.file_path);
}

function isWriteTool(name) {
  return /^(Write|StrReplace|Edit)$/i.test(name);
}

function isDeleteTool(name) {
  return /^Delete$/i.test(name);
}

function proposedContents(input, cwd, readFile) {
  const direct = asString(input.contents) ?? asString(input.content);
  if (direct !== undefined) return direct;

  const oldString = asString(input.old_string);
  const newString = asString(input.new_string);
  const filePath = toolPath(input);
  if (!oldString || !newString || !filePath) return null;

  const current = readFile(path.resolve(cwd, filePath));
  if (current === null || !current.includes(oldString)) return null;
  return current.replace(oldString, newString);
}

function deny(violation) {
  const agent_message = `Redline refused ${violation.path}: ${violation.reason}`;
  return { permission: "deny", user_message: agent_message, agent_message };
}

export function decidePreToolUse(payload, opts = {}) {
  const cwd = opts.cwd ?? ROOT;
  const readFile =
    opts.readFile ??
    ((abs) => {
      try {
        return readFileSync(abs, "utf8");
      } catch {
        return null;
      }
    });

  const toolName = asString(payload.tool_name) ?? "";
  const input = toolInputOf(payload);
  const filePath = toolPath(input);
  if (!filePath) return { permission: "allow" };

  const rel = repoRel(filePath, cwd);
  if (rel.startsWith("..")) return { permission: "allow" };

  if (isDeleteTool(toolName)) {
    const hit = checkContents(rel, "");
    return hit ? deny(hit) : { permission: "allow" };
  }

  if (!isWriteTool(toolName)) return { permission: "allow" };

  const next = proposedContents(input, cwd, readFile);
  if (next === null) return { permission: "allow" };
  const hit = checkContents(rel, next);
  return hit ? deny(hit) : { permission: "allow" };
}

export function isDeployCommand(command) {
  return DEPLOY_COMMAND.test(command);
}

export function decideDeploy(command, branch) {
  if (!isDeployCommand(command)) return { permission: "allow" };
  if (branch === "main") return { permission: "allow" };
  const agent_message =
    branch.length === 0
      ? "Could not read the current git branch. Confirm this deploy is from main (never from a feature branch)."
      : `Deploy is only allowed from main (current branch: ${branch}).`;
  return { permission: "ask", user_message: agent_message, agent_message };
}

export function currentBranch(cwd = ROOT) {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd,
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

export function runHookCli(argv = process.argv.slice(2), cwd = ROOT) {
  if (argv.includes("--check-tree")) {
    const violations = checkTree(cwd);
    if (violations.length === 0) {
      process.stdout.write("redline: clean\n");
      return 0;
    }
    for (const v of violations) {
      process.stdout.write(`${v.path}: ${v.reason}\n`);
    }
    return 1;
  }

  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    raw = "";
  }

  let payload = {};
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed;
      }
    } catch {
      printJson({ permission: "allow" });
      return 0;
    }
  }

  const event = asString(payload.hook_event_name);
  const command = asString(payload.command);
  if (event === "beforeShellExecution" || (command && !asString(payload.tool_name))) {
    printJson(decideDeploy(command ?? "", currentBranch(cwd)));
    return 0;
  }

  printJson(decidePreToolUse(payload, { cwd }));
  return 0;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
const self = fileURLToPath(import.meta.url);
if (invoked && path.resolve(invoked) === path.resolve(self)) {
  process.exitCode = runHookCli();
}
