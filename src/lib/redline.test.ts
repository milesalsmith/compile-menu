import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  checkContents,
  checkTree,
  decideDeploy,
  decidePreToolUse,
  isDeployCommand,
} from "../../.cursor/hooks/redline.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("redline — allergen properties", () => {
  it("rejects an allergen key on the extraction schema", () => {
    const hit = checkContents(
      "src/lib/extraction/schema.ts",
      `const item = { properties: { name: { type: "string" }, allergens: { type: "array" } } };`,
    );
    expect(hit?.path).toBe("src/lib/extraction/schema.ts");
    expect(hit?.reason).toMatch(/rule 000/);
  });

  it("rejects a glutenFree field on CompiledItem", () => {
    const hit = checkContents(
      "src/lib/types.ts",
      "export interface CompiledItem { glutenFree?: boolean }",
    );
    expect(hit).not.toBeNull();
  });

  it("does not flag the fence's UNSAFE_KEY or the volunteer-allergen test", () => {
    const validate = readFileSync(path.join(ROOT, "src/lib/extraction/validate.ts"), "utf8");
    const tests = readFileSync(path.join(ROOT, "src/lib/extraction/validate.test.ts"), "utf8");
    expect(validate).toMatch(/UNSAFE_KEY/);
    expect(tests).toMatch(/allergens: \["milk"\]/);
    expect(checkContents("src/lib/extraction/validate.ts", validate)).toBeNull();
    expect(checkContents("src/lib/extraction/validate.test.ts", tests)).toBeNull();
  });

  it("does not flag comments that mention allergens without a property", () => {
    expect(
      checkContents(
        "src/lib/extraction/schema.ts",
        "/* Deliberately absent: any allergen or gluten-free field. */\nconst item = { name: { type: 'string' } };",
      ),
    ).toBeNull();
  });
});

describe("redline — branded demo names", () => {
  it("rejects a Nando's name in the shipped demo dataset", () => {
    const hit = checkContents(
      "src/data/demo-menu.ts",
      `{ id: "butterfly-burger", name: "Nando's Butterfly Burger", format: "burger" }`,
    );
    expect(hit?.reason).toMatch(/generic/);
  });

  it("rejects peri-peri branding in demo-menu.ts", () => {
    expect(
      checkContents("src/data/demo-menu.ts", `plain: "peri-peri chicken in a roll"`),
    ).not.toBeNull();
  });

  it("does not scan other files for brand names", () => {
    expect(
      checkContents("src/lib/extraction/trace.test.ts", `expect(log).not.toMatch(/Nando/)`),
    ).toBeNull();
  });
});

describe("redline — verified numbers", () => {
  it("rejects entropy.test.ts with the 4.392 assertion removed", () => {
    const current = readFileSync(path.join(ROOT, "src/lib/entropy.test.ts"), "utf8");
    const stripped = current.replace("toBeCloseTo(4.392", "toBeCloseTo(0");
    const hit = checkContents("src/lib/entropy.test.ts", stripped);
    expect(hit?.reason).toMatch(/4\.392/);
  });

  it("rejects flow.test.ts with the 23-path assertion removed", () => {
    const current = readFileSync(path.join(ROOT, "src/lib/flow.test.ts"), "utf8");
    const stripped = current.replace("exactly 23 terminal identify paths", "some terminal paths");
    expect(checkContents("src/lib/flow.test.ts", stripped)).not.toBeNull();
  });
});

describe("redline — current tree", () => {
  it("passes on the files that are actually in the repo", () => {
    expect(checkTree(ROOT)).toEqual([]);
  });
});

describe("redline — preToolUse", () => {
  it("denies a Write that adds allergens to the schema", () => {
    const decision = decidePreToolUse(
      {
        tool_name: "Write",
        tool_input: {
          path: path.join(ROOT, "src/lib/extraction/schema.ts"),
          contents:
            "export const EXTRACTION_JSON_SCHEMA = { properties: { allergens: { type: 'array' } } };",
        },
      },
      { cwd: ROOT },
    );
    expect(decision.permission).toBe("deny");
    expect(decision.agent_message).toMatch(/rule 000/);
  });

  it("allows a README that talks about the allergen exclusion", () => {
    const decision = decidePreToolUse(
      {
        tool_name: "Write",
        tool_input: {
          path: path.join(ROOT, "README.md"),
          contents:
            "No allergen or gluten-free filtering. Safety-critical data is never inferred.",
        },
      },
      { cwd: ROOT },
    );
    expect(decision.permission).toBe("allow");
  });

  it("denies a StrReplace that introduces a branded demo name", () => {
    const current = readFileSync(path.join(ROOT, "src/data/demo-menu.ts"), "utf8");
    const decision = decidePreToolUse(
      {
        tool_name: "StrReplace",
        tool_input: {
          path: path.join(ROOT, "src/data/demo-menu.ts"),
          old_string: 'name: "Butterfly Burger"',
          new_string: 'name: "Nando\'s Butterfly Burger"',
        },
      },
      { cwd: ROOT, readFile: () => current },
    );
    expect(decision.permission).toBe("deny");
  });

  it("allows a Read of the schema", () => {
    const decision = decidePreToolUse(
      {
        tool_name: "Read",
        tool_input: { path: path.join(ROOT, "src/lib/extraction/schema.ts") },
      },
      { cwd: ROOT },
    );
    expect(decision.permission).toBe("allow");
  });
});

describe("redline — deploy from main", () => {
  it("recognises wrangler and pnpm deploy, not typegen", () => {
    expect(isDeployCommand("pnpm run deploy")).toBe(true);
    expect(isDeployCommand("npx wrangler deploy")).toBe(true);
    expect(isDeployCommand("pnpm exec wrangler types")).toBe(false);
  });

  it("allows deploy on main and asks on any other branch", () => {
    expect(decideDeploy("pnpm run deploy", "main").permission).toBe("allow");
    expect(decideDeploy("pnpm run deploy", "feature/pdf").permission).toBe("ask");
    expect(decideDeploy("pnpm test", "feature/pdf").permission).toBe("allow");
  });
});
