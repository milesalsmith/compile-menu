import { describe, expect, it } from "vitest";
import { classifyAiError } from "./ai-error";

describe("Workers AI error classification", () => {
  it("treats an explicit JSON Mode failure as schema_not_met", () => {
    expect(classifyAiError(new Error("JSON Mode couldn't be met")).reason).toBe("schema_not_met");
  });

  it("treats timeouts as their own failure, not a generic outage", () => {
    expect(classifyAiError(new Error("The operation timed out")).reason).toBe("ai_timeout");
    expect(classifyAiError(new Error("error code: 524")).reason).toBe("ai_timeout");
  });

  it("treats provider 429s as rate limited", () => {
    expect(classifyAiError(new Error("429 Too Many Requests")).reason).toBe("ai_rate_limited");
  });

  it("keeps Error.name only — never the message body", () => {
    const classified = classifyAiError(new Error("timeout while reading Chicken Butterfly 332 kcal"));
    expect(classified.reason).toBe("ai_timeout");
    expect(classified.errorClass).toBe("Error");
    expect(classified.errorClass).not.toMatch(/Chicken|Butterfly/i);
  });

  it("falls back to ai_unavailable for anything else", () => {
    expect(classifyAiError(new Error("internal")).reason).toBe("ai_unavailable");
  });

  it("does not classify from menu wording echoed in the error body", () => {
    const echoed = new Error(
      "Workers AI failed: see our cancellation policy on the Butterfly Burger timeout special"
    );
    expect(classifyAiError(echoed).reason).toBe("ai_unavailable");
  });
});
