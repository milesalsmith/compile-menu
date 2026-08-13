import { T } from "../theme";
import type { ExtractionTrace } from "../lib/extraction/trace";
import { formatTraceLines } from "../lib/extraction/trace";

/* The fenced step's working, in the same mono language as DecompileLog. */

interface ExtractionTracePanelProps {
  trace: ExtractionTrace;
  /** Optional heading shown above the lines. */
  heading?: string;
}

export default function ExtractionTracePanel({ trace, heading }: ExtractionTracePanelProps) {
  return (
    <div
      className="mono"
      style={{
        background: "#12100D",
        border: `1px solid ${T.line}`,
        borderRadius: 10,
        padding: "14px 18px",
        fontSize: 12.5,
        lineHeight: 1.85,
        color: T.dim,
        marginTop: 14,
        overflowWrap: "break-word",
      }}
    >
      <p style={{ margin: "0 0 6px", color: T.faint }}>
        {heading ?? "// extraction fence — timings and drop reasons, not the document"}
      </p>
      {formatTraceLines(trace).map((line) => (
        <p key={line} style={{ margin: 0, color: line.startsWith("  −") ? T.chili : T.dim }}>
          {line}
        </p>
      ))}
    </div>
  );
}
