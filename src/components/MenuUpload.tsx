import { useEffect, useRef, useState } from "react";
import { T } from "../theme";
import type { CompiledItem } from "../lib/types";
import type { CompiledMenu, MenuVocabulary } from "../lib/menu";
import { uploadedMenu } from "../lib/menu";
import { MAX_UPLOAD_BYTES, PDF_MIME } from "../lib/extraction/pipeline";

/* The upload entry point. The same mono panel the decompile log uses, so the
   probabilistic step reads as part of the same machine — but everything it
   claims to be doing is a real stage of the pipeline, not decoration. */

const STAGES = [
  "reading document",
  "converting pdf to text",
  "extracting the decision structure",
  "validating against the schema",
];

interface MenuUploadProps {
  onCompiled: (menu: CompiledMenu) => void;
  onCancel: () => void;
}

export default function MenuUpload({ onCompiled, onCancel }: MenuUploadProps) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2600);
    return () => clearInterval(timer);
  }, [busy]);

  async function upload(file: File) {
    if (file.type !== PDF_MIME) {
      setError("That file isn't a PDF. Upload the menu as a PDF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That PDF is too large. The limit is 8 MB.");
      return;
    }

    setError(null);
    setStage(0);
    setBusy(true);

    const body = new FormData();
    body.append("menu", file);

    try {
      const response = await fetch("/api/extract", { method: "POST", body });
      const payload = (await response.json()) as {
        items?: CompiledItem[];
        vocabulary?: MenuVocabulary;
        error?: string;
      };
      if (!response.ok || !payload.items || !payload.vocabulary) {
        setError(payload.error ?? "That menu couldn't be compiled. Try another PDF.");
        return;
      }
      onCompiled(uploadedMenu(file.name, payload.items, payload.vocabulary));
    } catch {
      setError("We couldn't reach the compiler. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise">
      <h2
        className="display"
        style={{ fontSize: "clamp(26px, 5vw, 34px)", fontWeight: 600, margin: "0 0 8px" }}
      >
        Compile your own menu.
      </h2>
      <p style={{ color: T.dim, fontSize: 14.5, lineHeight: 1.55, maxWidth: 460, marginBottom: 22 }}>
        Upload a menu PDF. It's read once, in memory, to recover the decisions underneath it —
        nothing is stored, and the questions you're asked are still computed, not written by anyone.
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
          {STAGES.map((label, i) => (
            <p key={label} style={{ margin: 0, color: i <= stage ? T.dim : T.faint }}>
              <span style={{ color: i < stage ? T.green : T.gold }}>{i < stage ? "✓" : "$"}</span>{" "}
              {label}
              {i === stage && (
                <span className="cursor" style={{ color: T.gold }}>
                  ▋
                </span>
              )}
            </p>
          ))}
          <p style={{ margin: "10px 0 0", color: T.faint }}>
            // this is the one step in the app that isn't deterministic. everything after it is.
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
        </div>
      )}
    </div>
  );
}
