import { Settings } from "lucide-react";
import { useState, useEffect } from "react";

interface HeroProps {
  title: string;
  onSettingsClick?: () => void;
}

export function Hero({ title, onSettingsClick }: HeroProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = time.getHours().toString().padStart(2, "0");
  const mm = time.getMinutes().toString().padStart(2, "0");
  const blink = time.getSeconds() % 2 === 0;

  return (
    <div style={{
      height: 52,
      background: "var(--accent)",
      padding: "0 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexShrink: 0,
    }}>
      <span style={{
        color: "rgba(255,255,255,0.55)",
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        flexShrink: 0,
      }}>
        BV
      </span>

      <span style={{
        color: "white",
        fontSize: 14,
        fontWeight: 700,
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {title}
      </span>

      <span style={{
        color: "rgba(255,255,255,0.85)",
        fontSize: 13,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.03em",
        flexShrink: 0,
      }}>
        {hh}<span style={{ opacity: blink ? 1 : 0.35, transition: "opacity 0.4s" }}>:</span>{mm}
      </span>

      <button
        onClick={onSettingsClick}
        style={{
          width: 30, height: 30, borderRadius: 9,
          background: "rgba(0,0,0,0.18)",
          border: "none",
          color: "rgba(255,255,255,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          padding: 0,
        }}
      >
        <Settings size={14} />
      </button>
    </div>
  );
}
