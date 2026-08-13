/* ---------- EXTRACTION TRACE ---------- */
/* The fenced step's "show working": timings, counts, and why items were
   dropped. Names in `samples` are for the uploader's tab only. Worker logs
   use traceForLog() — reason codes and numbers, never document text. */

export type DropReason =
  | "not_an_object"
  | "unexpected_keys"
  | "no_name"
  | "placeholder_name"
  | "plain_missing"
  | "plain_repeats_name"
  | "evidence_missing"
  | "evidence_too_long"
  | "evidence_not_in_source"
  | "name_not_in_evidence"
  | "name_not_in_source"
  | "unknown_format"
  | "unknown_protein"
  | "unknown_style"
  | "bad_flags"
  | "vegan_without_vegetarian"
  | "vegetarian_ungrounded"
  | "vegan_ungrounded"
  | "veg_protein_mismatch";

export type ExtractStage = "reject_upload" | "convert" | "extract" | "validate" | "done";

export interface DropSample {
  reason: DropReason;
  /** Model-proposed name, if any. Session UI only — never written to logs. */
  name?: string;
}

/** Keys and counts only — never model values or document text. */
export interface ModelShape {
  kind: "object" | "array" | "null" | "other";
  keys: string[];
  itemsKey: string | null;
  itemCount: number | null;
}

export interface ExtractionTrace {
  stage: ExtractStage;
  bytes: number;
  markdownChars: number;
  timings: {
    convertMs: number;
    extractMs: number;
    validateMs: number;
    totalMs: number;
  };
  proposed: number;
  kept: number;
  collapsedFrom: number;
  drops: Partial<Record<DropReason, number>>;
  samples: DropSample[];
  varietyGain: number | null;
  modelShape: ModelShape | null;
  /** Error.name only — never a message that might echo document text. */
  aiErrorClass?: string;
}

export const MAX_DROP_SAMPLES = 8;

export function emptyTrace(partial: Partial<ExtractionTrace> = {}): ExtractionTrace {
  return {
    stage: "reject_upload",
    bytes: 0,
    markdownChars: 0,
    timings: { convertMs: 0, extractMs: 0, validateMs: 0, totalMs: 0 },
    proposed: 0,
    kept: 0,
    collapsedFrom: 0,
    drops: {},
    samples: [],
    varietyGain: null,
    modelShape: null,
    ...partial,
  };
}

export function recordDrop(
  trace: { drops: Partial<Record<DropReason, number>>; samples: DropSample[] },
  reason: DropReason,
  name?: string
): void {
  trace.drops[reason] = (trace.drops[reason] ?? 0) + 1;
  if (trace.samples.length < MAX_DROP_SAMPLES) {
    trace.samples.push(name ? { reason, name } : { reason });
  }
}

/** Counts and timings only — safe for worker logs. */
export function traceForLog(trace: ExtractionTrace): string {
  const drops = Object.entries(trace.drops)
    .filter(([, n]) => (n ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([reason, n]) => `${reason}:${n}`)
    .join(",");
  const bits = [
    `stage=${trace.stage}`,
    `totalMs=${trace.timings.totalMs}`,
    `convertMs=${trace.timings.convertMs}`,
    `extractMs=${trace.timings.extractMs}`,
    `validateMs=${trace.timings.validateMs}`,
    `bytes=${trace.bytes}`,
    `md=${trace.markdownChars}`,
    `proposed=${trace.proposed}`,
    `kept=${trace.kept}`,
  ];
  if (trace.varietyGain !== null) bits.push(`gain=${trace.varietyGain.toFixed(2)}`);
  if (trace.aiErrorClass) bits.push(`ai=${trace.aiErrorClass}`);
  if (trace.modelShape) {
    const shape = trace.modelShape;
    bits.push(`shape=${shape.kind}`);
    if (shape.keys.length) bits.push(`keys=${shape.keys.join(",")}`);
    if (shape.itemsKey) bits.push(`itemsKey=${shape.itemsKey}`);
    if (shape.itemCount !== null) bits.push(`n=${shape.itemCount}`);
  }
  if (drops) bits.push(`drops=${drops}`);
  return bits.join(" ");
}

/** Human lines for the upload / decompile mono panel. */
export function formatTraceLines(trace: ExtractionTrace): string[] {
  const lines = [
    `stage ${trace.stage} · ${trace.timings.totalMs}ms total`,
    `convert ${trace.timings.convertMs}ms · extract ${trace.timings.extractMs}ms · validate ${trace.timings.validateMs}ms`,
    `pdf ${trace.bytes} bytes · markdown ${trace.markdownChars} chars`,
    trace.collapsedFrom > trace.kept
      ? `proposed ${trace.proposed} → grounded ${trace.collapsedFrom} → kept ${trace.kept} after size collapse`
      : `proposed ${trace.proposed} → kept ${trace.kept}`,
  ];
  if (trace.varietyGain !== null) {
    lines.push(`best filter gain ${trace.varietyGain.toFixed(2)} bits`);
  }
  if (trace.modelShape) {
    const shape = trace.modelShape;
    const keyBit = shape.keys.length > 0 ? `keys ${shape.keys.join(", ")}` : shape.kind;
    const itemsBit =
      shape.itemsKey !== null
        ? `items via ${shape.itemsKey} (${shape.itemCount ?? 0})`
        : "no items array";
    lines.push(`model ${keyBit} · ${itemsBit}`);
  }
  if (trace.aiErrorClass) lines.push(`ai error class ${trace.aiErrorClass}`);
  const dropBits = Object.entries(trace.drops)
    .filter(([, n]) => (n ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([reason, n]) => `${reason} ${n}`);
  if (dropBits.length) lines.push(`drops ${dropBits.join(" · ")}`);
  for (const sample of trace.samples) {
    lines.push(sample.name ? `  − ${sample.reason} · ${sample.name}` : `  − ${sample.reason}`);
  }
  return lines;
}
