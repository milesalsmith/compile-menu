/* Classify Workers AI failures without trusting the message body — it might
   echo prompt text. We only keep Error.name for the trace. */

export type AiFailureReason = "schema_not_met" | "ai_timeout" | "ai_rate_limited" | "ai_unavailable";

export function classifyAiError(error: unknown): { reason: AiFailureReason; errorClass: string } {
  const message = error instanceof Error ? error.message : String(error);
  const errorClass = error instanceof Error && error.name ? error.name : "Error";

  if (/json mode/i.test(message)) return { reason: "schema_not_met", errorClass };

  /* Prefer Error.name — Workers AI can echo prompt/menu text in the message
     body, so words like "cancel" in a cancellation policy must not classify
     the failure. */
  if (/timeout|abort/i.test(errorClass)) return { reason: "ai_timeout", errorClass };

  /* Provider codes live at the start of the message. Ignore the rest —
     48 chars covers "The operation timed out" / "error code: 524"
     without reaching echoed menu copy. */
  const head = message.slice(0, 48);
  if (/\b429\b|rate.?limit|too many requests/i.test(head)) {
    return { reason: "ai_rate_limited", errorClass };
  }
  if (/\b(timeout|timed out|deadline|524|408)\b/i.test(head)) {
    return { reason: "ai_timeout", errorClass };
  }
  return { reason: "ai_unavailable", errorClass };
}
