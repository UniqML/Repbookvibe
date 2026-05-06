import { useState } from "react";
import { MessageCircle, BookMarked, Plus, CalendarDays, User } from "lucide-react";

type Tab = "chats" | "shelves" | "add" | "trackers" | "profile";

interface BottomNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: React.ElementType; label: string; isCenter?: boolean }[] = [
  { id: "chats", icon: MessageCircle, label: "Chats" },
  { id: "shelves", icon: BookMarked, label: "Shelves" },
  { id: "add", icon: Plus, label: "Add", isCenter: true },
  { id: "trackers", icon: CalendarDays, label: "Trackers" },
  { id: "profile", icon: User, label: "Profile" },
];

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const [pressed, setPressed] = useState<Tab | null>(null);

  const handlePress = (id: Tab) => {
    setPressed(id);
    onTabChange(id);
    setTimeout(() => setPressed(null), 150);
  };

  return (
    <nav
      className="grid grid-cols-5 gap-1.5 px-3 pt-3 pb-5 bg-[var(--paper)]/80 backdrop-blur-xl border-t border-[var(--line)]"
      style={{ height: 92 }}
    >
      {tabs.map(({ id, icon: Icon, label, isCenter }) => {
        const isActive = activeTab === id;
        const isPressed = pressed === id;

        if (isCenter) {
          return (
            <button
              key={id}
              onPointerDown={() => setPressed(id)}
              onPointerUp={() => handlePress(id)}
              onPointerLeave={() => setPressed(null)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-3xl text-white select-none transition-all duration-150 ease-out ${
                isPressed ? "scale-90 -translate-y-2" : "scale-100 -translate-y-4"
              }`}
              style={{
                minHeight: 72,
                background: `radial-gradient(circle at 70% 18%, rgba(255,255,255,0.5), transparent 16px), 
                             linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent), #1f1510 45%))`,
                boxShadow: isPressed
                  ? "0 4px 12px color-mix(in srgb, var(--accent), transparent 70%)"
                  : "0 12px 28px color-mix(in srgb, var(--accent), transparent 55%)",
              }}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-6 h-6" strokeWidth={2.5} />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          );
        }

        return (
          <button
            key={id}
            onPointerDown={() => setPressed(id)}
            onPointerUp={() => handlePress(id)}
            onPointerLeave={() => setPressed(null)}
            className={`flex flex-col items-center justify-center gap-1 rounded-full p-2 select-none transition-all duration-150 ${
              isActive
                ? "text-[var(--accent)] bg-[var(--paper-soft)]"
                : "text-[var(--muted)] bg-transparent"
            } ${isPressed ? "scale-90 translate-y-0.5" : "scale-100 translate-y-0"}`}
            style={{
              minHeight: 60,
              boxShadow: isActive && !isPressed
                ? "0 2px 10px color-mix(in srgb, var(--accent), transparent 80%)"
                : "none",
            }}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[11px] ${isActive ? "font-semibold" : "font-medium"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
