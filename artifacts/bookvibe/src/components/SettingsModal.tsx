import { X, Check, Globe, Palette, LogOut, LogIn, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import type { Lang } from "@/i18n/translations";
import { UserAvatar } from "@/components/UserAvatar";
import { generateAvatarSeeds, getDefaultAvatarSeed } from "@/lib/avatar";

type Theme = "academia" | "romance" | "forest" | "contrast";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

const THEME_OPTIONS: { id: Theme; accent: string; label: (t: ReturnType<typeof useLanguage>["t"]) => string }[] = [
  { id: "academia", accent: "#b8895d", label: (t) => t("darkAcademia") },
  { id: "romance", accent: "#c75f87", label: (t) => t("pinkRomance") },
  { id: "forest", accent: "#5d8b67", label: (t) => t("fantasyForest") },
  { id: "contrast", accent: "#ffcf33", label: (t) => t("highContrast") },
];

const LANG_OPTIONS: { id: Lang; flag: string; label: (t: ReturnType<typeof useLanguage>["t"]) => string }[] = [
  { id: "ru", flag: "🇷🇺", label: (t) => t("russian") },
  { id: "en", flag: "🇬🇧", label: (t) => t("english") },
  { id: "zh", flag: "🇨🇳", label: (t) => t("chinese") },
];

export function SettingsModal({ open, onClose, theme, onThemeChange }: SettingsModalProps) {
  const { t, lang, setLang } = useLanguage();
  const { user, logout, updateProfile } = useAuth();

  if (!open) return null;

  const displayName = user?.displayName || t("guestAccount");
  const avatarSeed = user?.avatarSeed || localStorage.getItem("bookvibe_avatar_seed") || getDefaultAvatarSeed(user);
  const avatarSeeds = generateAvatarSeeds(user?.email || displayName);

  const selectAvatarSeed = async (seed: string) => {
    localStorage.setItem("bookvibe_avatar_seed", seed);
    if (user && !user.isAnonymous) {
      await updateProfile(undefined, undefined, seed);
    }
  };

  const section = (title: string, icon: React.ReactNode, children: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
        <span style={{ color: "var(--accent)" }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.55)", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40, backdropFilter: "blur(3px)" }}
      />
      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 50,
          background: "var(--paper)",
          borderRadius: "28px 28px 0 0",
          padding: "0 0 40px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.22)",
          maxHeight: "88%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 22px 14px" }}>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: "var(--ink)" }}>{t("settings")}</h2>
          <button
            onClick={onClose}
            style={{ border: "1px solid var(--line)", borderRadius: "50%", width: 36, height: 36, background: "var(--paper-soft)", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", gap: 18 }}>

          {section(t("theme"), <Palette size={14} />,
            <div>
              {THEME_OPTIONS.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => onThemeChange(opt.id)}
                  style={{
                    width: "100%", border: "none", borderBottom: i < THEME_OPTIONS.length - 1 ? "1px solid var(--line)" : "none",
                    background: "transparent", padding: "13px 16px",
                    display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                  }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: opt.accent, flexShrink: 0, border: theme === opt.id ? "2px solid var(--accent)" : "2px solid transparent", display: "inline-block", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }} />
                  <span style={{ flex: 1, textAlign: "left", fontSize: 14, color: "var(--ink)", fontWeight: theme === opt.id ? 700 : 400 }}>{opt.label(t)}</span>
                  {theme === opt.id && <Check size={15} style={{ color: "var(--accent)" }} />}
                </button>
              ))}
            </div>
          )}

          {section(t("language"), <Globe size={14} />,
            <div>
              {LANG_OPTIONS.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => setLang(opt.id)}
                  style={{
                    width: "100%", border: "none", borderBottom: i < LANG_OPTIONS.length - 1 ? "1px solid var(--line)" : "none",
                    background: "transparent", padding: "13px 16px",
                    display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{opt.flag}</span>
                  <span style={{ flex: 1, textAlign: "left", fontSize: 14, color: "var(--ink)", fontWeight: lang === opt.id ? 700 : 400 }}>{opt.label(t)}</span>
                  {lang === opt.id && <Check size={15} style={{ color: "var(--accent)" }} />}
                </button>
              ))}
            </div>
          )}

          {section("Аватарка", <Sparkles size={14} />,
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <UserAvatar seed={avatarSeed} name={displayName} email={user?.email} id={user?.id} size={40} radius={12} />
                <div>
                  <div style={{ color: "var(--ink)", fontSize: 14, fontWeight: 800 }}>Сменить аватарку</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>12 вариантов DiceBear по вашему email</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {avatarSeeds.map((seed) => (
                  <button
                    key={seed}
                    onClick={() => selectAvatarSeed(seed)}
                    style={{
                      border: avatarSeed === seed ? "2px solid var(--accent)" : "1px solid var(--line)",
                      borderRadius: 14,
                      padding: 6,
                      background: "rgba(255,255,255,0.7)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                    }}
                    title="Выбрать аватарку"
                  >
                    <UserAvatar seed={seed} size={46} radius={12} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {section(t("account"), <span style={{ fontSize: 14 }}>👤</span>,
            <div style={{ padding: "4px 0" }}>
              {user ? (
                <button
                  onClick={() => { logout(); onClose(); }}
                  style={{
                    width: "100%", border: "none", background: "transparent", padding: "13px 16px",
                    display: "flex", alignItems: "center", gap: 12, cursor: "pointer", color: "#e05252",
                  }}
                >
                  <LogOut size={16} style={{ color: "#e05252" }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{t("logout")}</span>
                </button>
              ) : (
                <div style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, color: "var(--muted)" }}>
                  <LogIn size={16} />
                  <span style={{ fontSize: 14 }}>{t("login")}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
