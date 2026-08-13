import { describe, expect, it } from "vitest";
import { emptyTrace, formatTraceLines, recordDrop, traceForLog } from "./trace";

describe("extraction trace — inspectable, not a document dump", () => {
  it("counts drop reasons and keeps a short sample list", () => {
    const trace = emptyTrace();
    recordDrop(trace, "evidence_not_in_source", "Secret Dish");
    recordDrop(trace, "evidence_not_in_source", "Other Dish");
    recordDrop(trace, "vegetarian_ungrounded", "Garden Bowl");
    expect(trace.drops.evidence_not_in_source).toBe(2);
    expect(trace.drops.vegetarian_ungrounded).toBe(1);
    expect(trace.samples).toHaveLength(3);
  });

  it("never puts item names in the worker log line", () => {
    const trace = emptyTrace({
      stage: "validate",
      proposed: 40,
      kept: 2,
      markdownChars: 12000,
      timings: { convertMs: 800, extractMs: 24000, validateMs: 4, totalMs: 24810 },
    });
    recordDrop(trace, "evidence_not_in_source", "Nando's Butterfly");
    const log = traceForLog(trace);
    expect(log).toContain("stage=validate");
    expect(log).toContain("extractMs=24000");
    expect(log).toContain("drops=evidence_not_in_source:1");
    expect(log).not.toMatch(/Nando|Butterfly|Secret/i);
  });

  it("formats timings and drops for the UI panel", () => {
    const trace = emptyTrace({
      stage: "validate",
      proposed: 10,
      kept: 2,
      collapsedFrom: 3,
      varietyGain: 0.12,
      timings: { convertMs: 100, extractMs: 2000, validateMs: 5, totalMs: 2105 },
    });
    recordDrop(trace, "name_not_in_evidence", "Deluxe");
    const lines = formatTraceLines(trace);
    expect(lines.some((l) => l.includes("2105ms total"))).toBe(true);
    expect(lines.some((l) => l.includes("name_not_in_evidence · Deluxe"))).toBe(true);
  });

  it("logs model shape as keys and counts, never values", () => {
    const trace = emptyTrace({
      stage: "validate",
      modelShape: {
        kind: "object",
        keys: ["dishes", "meta"],
        itemsKey: "dishes",
        itemCount: 18,
      },
    });
    const log = traceForLog(trace);
    expect(log).toContain("shape=object");
    expect(log).toContain("keys=dishes,meta");
    expect(log).toContain("itemsKey=dishes");
    expect(log).toContain("n=18");
    expect(formatTraceLines(trace).some((l) => l.includes("items via dishes (18)"))).toBe(true);
  });
});
