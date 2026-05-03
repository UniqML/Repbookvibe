import { useState } from "react";
import { MessageCircleHeart, Library, BookOpen, CalendarDays, User } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

type Tab = "chats" | "shelves" | "book" | "trackers" | "profile";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useLanguage();
  const [pressed, setPressed] = useState<Tab | null>(null);

  const TABS: { id: Tab; icon: React.FC<{ size?: number }>; labelKey: Parameters<typeof t>[0]; isCenter?: boolean }[] = [
    { id: "chats", icon: MessageCircleHeart, labelKey: "chats" },
    { id: "shelves", icon: Library, labelKey: "shelves" },
    { id: "book", icon: BookOpen, labelKey: "book", isCenter: true },
    { id: "trackers", icon: CalendarDays, labelKey: "trackers" },
    { id: "profile", icon: User, labelKey: "profile" },
  ];

  const handlePress = (id: Tab) => {
    setPressed(id);
    onTabChange(id);
    setTimeout(() => setPressed(null), 180);
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 6,
      padding: "12px 12px 18px",
      background: "rgba(255,255,255,0.72)",
      borderTop: "1px solid var(--line)",
      backdropFilter: "blur(20px)",
      height: 92,
    }}>
      {TABS.map(({ id, icon: Icon, labelKey, isCenter }) => {
        const isActive = activeTab === id;
        const isPressed = pressed === id;

        if (isCenter) {
          return (
            <button
              key={id}
              onPointerDown={() => setPressed(id)}
              onPointerUp={() => handlePress(id)}
              onPointerLeave={() => setPressed(null)}
              style={{
                transform: isPressed ? "translateY(-12px) scale(0.92)" : "translateY(-18px) scale(1)",
                minHeight: 74,
                borderRadius: 24,
                background: `radial-gradient(circle at 70% 18%, rgba(255,255,255,0.62), transparent 16px), linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent), #1f1510 45%))`,
                color: "white",
                boxShadow: isPressed
                  ? "0 4px 10px color-mix(in srgb, var(--accent), transparent 70%)"
                  : "0 12px 28px color-mix(in srgb, var(--accent), transparent 58%)",
                border: 0,
                display: "grid",
                placeItems: "center",
                gap: 2,
                cursor: "pointer",
                transition: "transform 0.12s cubic-bezier(.34,1.56,.64,1), box-shadow 0.12s ease",
                userSelect: "none",
              }}
            >
              <Icon size={24} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>{t(labelKey)}</span>
            </button>
          );
        }

        return (
          <button
            key={id}
            onPointerDown={() => setPressed(id)}
            onPointerUp={() => handlePress(id)}
            onPointerLeave={() => setPressed(null)}
            style={{
              minWidth: 0,
              minHeight: 60,
              display: "grid",
              placeItems: "center",
              gap: 2,
              color: isActive ? "var(--accent)" : "var(--muted)",
              background: isActive ? "var(--paper-soft)" : "transparent",
              border: 0,
              borderRadius: 999,
              padding: "7px 4px",
              cursor: "pointer",
              transform: isPressed ? "scale(0.88) translateY(2px)" : "scale(1) translateY(0)",
              boxShadow: isActive && !isPressed
                ? "0 2px 8px color-mix(in srgb, var(--accent), transparent 80%)"
                : "none",
              transition: "transform 0.1s cubic-bezier(.34,1.56,.64,1), color 0.2s, background 0.2s, box-shadow 0.15s",
              userSelect: "none",
            }}
          >
            <Icon size={22} />
            <span style={{ fontSize: 11 }}>{t(labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
