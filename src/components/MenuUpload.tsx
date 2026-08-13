import { useEffect, useRef, useState } from "react";
import { T } from "../theme";
import type { CompiledItem } from "../lib/types";
import type { CompiledMenu, MenuVocabulary } from "../lib/menu";
import { uploadedMenu } from "../lib/menu";
import type { ExtractionTrace } from "../lib/extraction/trace";
import { MAX_UPLOAD_BYTES, PDF_MIME } from "../lib/extraction/pipeline";
import ExtractionTracePanel from "./ExtractionTracePanel";

/* One round-trip. The long wait is Workers AI (convert + extract), not
   schema validation — that last step is milliseconds of TypeScript. */

interface MenuUploadProps {
  onCompiled: (menu: CompiledMenu) => void;
  onCancel: () => void;
}

export default function MenuUpload({ onCompiled, onCancel }: MenuUploadProps) {
  const [busy, setBusy] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [trace, setTrace] = useState<ExtractionTrace | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const tick = () => setElapsedMs(Date.now() - started);
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [busy]);

  async function upload(file: File) {
    if (file.type !== PDF_MIME) {
      setError("That file isn't a PDF. Upload the menu as a PDF.");
      setCode("unsupported_file_type");
      setTrace(null);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That PDF is too large. The limit is 8 MB.");
      setCode("file_too_large");
      setTrace(null);
      return;
    }

    setError(null);
    setCode(null);
    setTrace(null);
    setElapsedMs(0);
    setBusy(true);

    const body = new FormData();
    body.append("menu", file);

    try {
      const response = await fetch("/api/extract", { method: "POST", body });
      const payload = (await response.json()) as {
        items?: CompiledItem[];
        vocabulary?: MenuVocabulary;
        error?: string;
        code?: string;
        trace?: ExtractionTrace;
      };
      if (!response.ok || !payload.items || !payload.vocabulary) {
        setError(payload.error ?? "That menu couldn't be compiled. Try another PDF.");
        setCode(payload.code ?? `http_${response.status}`);
        setTrace(payload.trace ?? null);
        return;
      }
      onCompiled(uploadedMenu(file.name, payload.items, payload.vocabulary, payload.trace));
    } catch {
      setError("We couldn't reach the compiler. Check your connection and try again.");
      setCode("network_error");
      setTrace(null);
    } finally {
      setBusy(false);
    }
  }

  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="rise">
      <h2
        className="display"
        style={{ fontSize: "clamp(26px, 5vw, 34px)", fontWeight: 600, margin: "0 0 8px" }}
      >
        Compile your own menu.{" "}
        <span className="mono" style={{ color: T.faint, fontSize: 13, fontWeight: 500 }}>
          beta
        </span>
      </h2>
      <p style={{ color: T.dim, fontSize: 14.5, lineHeight: 1.55, maxWidth: 460, marginBottom: 22 }}>
        Upload a text-based mains PDF — itemised dishes, not a photo or scan of the page. It's read
        once, in this tab only: nothing is stored, and the questions you're asked are still computed,
        not written by anyone.
      </p>

      <input
        ref={input}
        type="file"
        accept="application/pdf"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <button
          onClick={() => input.current?.click()}
          disabled={busy}
          style={{
            background: busy ? T.surface2 : T.ember,
            border: "none",
            color: busy ? T.dim : "#1A0F08",
            fontWeight: 600,
            fontSize: 15,
            padding: "13px 24px",
            borderRadius: 8,
          }}
        >
          {busy ? "Compiling…" : "Choose a PDF"}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="mono"
          style={{
            background: "none",
            border: `1px solid ${T.line}`,
            color: T.dim,
            fontSize: 12.5,
            padding: "13px 18px",
            borderRadius: 8,
          }}
        >
          use the demo menu
        </button>
      </div>

      {busy && (
        <div
          className="mono rise"
          style={{
            background: "#12100D",
            border: `1px solid ${T.line}`,
            borderRadius: 10,
            padding: "14px 18px",
            fontSize: 12.5,
            lineHeight: 1.9,
            color: T.dim,
          }}
        >
          <p style={{ margin: 0 }}>
            <span style={{ color: T.gold }}>$</span> one request · convert → extract → validate{" "}
            <span style={{ color: T.gold }}>{seconds}s</span>
            <span className="cursor" style={{ color: T.gold }}>
              ▋
            </span>
          </p>
          <p style={{ margin: "10px 0 0", color: T.faint }}>
            // the long wait is Workers AI (toMarkdown + JSON Mode). validation itself is milliseconds.
          </p>
        </div>
      )}

      {error && !busy && (
        <div
          className="mono rise"
          style={{
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderLeft: `3px solid ${T.chili}`,
            borderRadius: 10,
            padding: "14px 18px",
            fontSize: 12.5,
            lineHeight: 1.7,
            color: T.dim,
          }}
        >
          <span style={{ color: T.chili }}>−</span> {error}
          {code && (
            <p style={{ margin: "8px 0 0", color: T.faint }}>
              reason <span style={{ color: T.gold }}>{code}</span>
            </p>
          )}
        </div>
      )}

      {trace && !busy && <ExtractionTracePanel trace={trace} />}
    </div>
  );
}
