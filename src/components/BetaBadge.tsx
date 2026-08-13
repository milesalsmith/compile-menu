import { T } from "../theme";

/* Small, light label — faint brown on dark read as disabled, not beta. */

export default function BetaBadge() {
  return (
    <span
      className="mono"
      style={{
        display: "inline-block",
        color: T.text,
        background: "rgba(223, 161, 63, 0.2)",
        border: `1px solid ${T.gold}`,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: 4,
        verticalAlign: "middle",
        lineHeight: 1.4,
      }}
    >
      beta
    </span>
  );
}
