import { useState } from "react";
import { X, Check, Globe, Palette, LogOut, LogIn, Sparkles, RotateCcw, AlertTriangle, HeadphonesIcon, Send, MessageCircle, Mail } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import type { Lang } from "@/i18n/translations";
import { UserAvatar } from "@/components/UserAvatar";
import { generateAvatarSeeds, getDefaultAvatarSeed } from "@/lib/avatar";
import { LegalModal } from "@/components/LegalModal";

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

const TELEGRAM_URL = import.meta.env.VITE_TELEGRAM_URL || "https://t.me/bookvibe";
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@bookvibe.app";
const API_URL = import.meta.env.VITE_API_URL || "/api";

type SupportStep = "idle" | "form" | "sending" | "done" | "error";
type ContactsStep = "idle" | "open";
type LegalDoc = "terms" | "privacy" | null;

export function SettingsModal({ open, onClose, theme, onThemeChange }: SettingsModalProps) {
  const { t, lang, setLang } = useLanguage();
  const { user, logout, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [supportStep, setSupportStep] = useState<SupportStep>("idle");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [contactsOpen, setContactsOpen] = useState<ContactsStep>("idle");
  const [legalDoc, setLegalDoc] = useState<LegalDoc>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  if (!open) return null;

  const handleResetStats = async () => {
    setResetting(true);
    try {
      const token = localStorage.getItem("bookvibe_token");
      const res = await fetch("/api/stats/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Server error");
      localStorage.removeItem("bookvibe_reading_sessions");
      await queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setResetConfirm(false);
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3500);
    } catch {
      setResetConfirm(false);
    } finally {
      setResetting(false);
    }
  };

  const handleSendSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) return;
    setSupportStep("sending");
    try {
      const token = localStorage.getItem("bookvibe_token");
      const res = await fetch(`${API_URL}/support`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: supportSubject.trim(),
          message: supportMessage.trim(),
          userEmail: user?.email || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSupportStep("done");
    } catch {
      setSupportStep("error");
    }
  };

  const displayName = user?.displayName || t("guestAccount");
  const avatarSeed = user?.avatarSeed || localStorage.getItem("bookvibe_avatar_seed") || getDefaultAvatarSeed(user);
  const avatarSeeds = generateAvatarSeeds(user?.email || displayName);

  const selectAvatarSeed = async (seed: string) => {
    setAvatarError(false);
    if (user && !user.isAnonymous) {
      setAvatarSaving(true);
      try {
        await updateProfile(undefined, undefined, seed);
        localStorage.setItem("bookvibe_avatar_seed", seed);
      } catch {
        setAvatarError(true);
      } finally {
        setAvatarSaving(false);
      }
    } else {
      localStorage.setItem("bookvibe_avatar_seed", seed);
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

  const rowBtn = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    hasBorder = true,
    accent = false,
  ) => (
    <button
      onClick={onClick}
      style={{
        width: "100%", border: "none",
        borderBottom: hasBorder ? "1px solid var(--line)" : "none",
        background: "transparent", padding: "13px 16px",
        display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
        color: accent ? "var(--accent)" : "var(--ink)",
      }}
    >
      <span style={{ color: "var(--accent)", display: "flex" }}>{icon}</span>
      <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 500 }}>{label}</span>
      <span style={{ color: "var(--muted)", fontSize: 16 }}>›</span>
    </button>
  );

  return (
    <>
      {legalDoc && (
        <LegalModal type={legalDoc} onClose={() => setLegalDoc(null)} />
      )}

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
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {avatarSaving ? "Сохраняю..." : "12 вариантов DiceBear по вашему email"}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, opacity: avatarSaving ? 0.6 : 1, pointerEvents: avatarSaving ? "none" : "auto" }}>
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
              {avatarError && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#e05252", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>⚠</span> Не удалось сохранить аватарку. Попробуйте ещё раз.
                </div>
              )}
            </div>
          )}

          {section("Поддержка и контакты", <HeadphonesIcon size={14} />,
            <div>
              {rowBtn(<Mail size={15} />, "Написать в поддержку", () => setSupportStep(supportStep === "idle" ? "form" : "idle"), true)}
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "13px 16px", borderBottom: "1px solid var(--line)",
                  textDecoration: "none", color: "var(--ink)",
                }}
              >
                <span style={{ color: "var(--accent)", display: "flex", alignItems: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 14.017l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.983.542z"/>
                  </svg>
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>Telegram-сообщество</span>
                <span style={{ color: "var(--muted)", fontSize: 16 }}>›</span>
              </a>
              {rowBtn(<MessageCircle size={15} />, "Контакты", () => setContactsOpen(contactsOpen === "idle" ? "open" : "idle"), false)}

              {supportStep !== "idle" && (
                <div style={{ padding: "14px 16px", borderTop: "1px solid var(--line)", background: "rgba(255,255,255,0.4)" }}>
                  {supportStep === "done" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#16a34a" }}>
                      <Check size={16} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Сообщение отправлено! Ответим в ближайшее время.</span>
                    </div>
                  ) : supportStep === "error" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ color: "#e05252", fontSize: 13 }}>Не удалось отправить. Напишите напрямую: {SUPPORT_EMAIL}</div>
                      <button onClick={() => setSupportStep("idle")} style={{ border: 0, background: "transparent", color: "var(--accent)", fontSize: 13, cursor: "pointer", textAlign: "left" }}>Закрыть</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <input
                        value={supportSubject}
                        onChange={e => setSupportSubject(e.target.value)}
                        placeholder="Тема обращения"
                        maxLength={200}
                        style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "9px 12px", fontSize: 13, background: "rgba(255,255,255,0.7)", color: "var(--ink)", outline: "none", fontFamily: "inherit" }}
                      />
                      <textarea
                        value={supportMessage}
                        onChange={e => setSupportMessage(e.target.value)}
                        placeholder="Опишите проблему или вопрос..."
                        maxLength={2000}
                        rows={4}
                        style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "9px 12px", fontSize: 13, background: "rgba(255,255,255,0.7)", color: "var(--ink)", outline: "none", fontFamily: "inherit", resize: "none" }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => { setSupportStep("idle"); setSupportSubject(""); setSupportMessage(""); }}
                          style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 12, padding: "10px", background: "transparent", color: "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                        >
                          Отмена
                        </button>
                        <button
                          onClick={handleSendSupport}
                          disabled={supportStep === "sending" || !supportSubject.trim() || !supportMessage.trim()}
                          style={{
                            flex: 2, border: 0, borderRadius: 12, padding: "10px",
                            background: supportSubject.trim() && supportMessage.trim() ? "var(--accent)" : "var(--line)",
                            color: supportSubject.trim() && supportMessage.trim() ? "white" : "var(--muted)",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          }}
                        >
                          <Send size={13} />
                          {supportStep === "sending" ? "Отправляю..." : "Отправить"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {contactsOpen === "open" && (
                <div style={{ padding: "14px 16px", borderTop: "1px solid var(--line)", background: "rgba(255,255,255,0.4)" }}>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>Связаться с нами:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <a href={`mailto:${SUPPORT_EMAIL}`} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
                      <Mail size={14} />
                      {SUPPORT_EMAIL}
                    </a>
                    <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "#229ED9", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 14.017l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.983.542z"/>
                      </svg>
                      Telegram-сообщество
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {section("Документы", <span style={{ fontSize: 14 }}>📄</span>,
            <div>
              <button
                onClick={() => setLegalDoc("terms")}
                style={{ width: "100%", border: "none", borderBottom: "1px solid var(--line)", background: "transparent", padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
              >
                <span style={{ flex: 1, textAlign: "left", fontSize: 14, color: "var(--ink)" }}>Условия использования</span>
                <span style={{ color: "var(--muted)", fontSize: 16 }}>›</span>
              </button>
              <button
                onClick={() => setLegalDoc("privacy")}
                style={{ width: "100%", border: "none", background: "transparent", padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
              >
                <span style={{ flex: 1, textAlign: "left", fontSize: 14, color: "var(--ink)" }}>Политика конфиденциальности</span>
                <span style={{ color: "var(--muted)", fontSize: 16 }}>›</span>
              </button>
            </div>
          )}

          {section(t("account"), <span style={{ fontSize: 14 }}>👤</span>,
            <div style={{ padding: "4px 0" }}>
              {user && !user.isAnonymous && (
                <button
                  onClick={() => setResetConfirm(true)}
                  style={{
                    width: "100%", border: "none", borderBottom: "1px solid var(--line)",
                    background: "transparent", padding: "13px 16px",
                    display: "flex", alignItems: "center", gap: 12, cursor: "pointer", color: "#e05252",
                  }}
                >
                  <RotateCcw size={16} style={{ color: "#e05252" }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Сбросить статистику</span>
                </button>
              )}
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

          {resetDone && (
            <div style={{
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)",
              borderRadius: 16, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Check size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>
                Статистика успешно сброшена
              </span>
            </div>
          )}
        </div>
      </div>

      {resetConfirm && (
        <>
          <div
            onClick={() => !resetting && setResetConfirm(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60, backdropFilter: "blur(4px)" }}
          />
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 70, width: "calc(100% - 40px)", maxWidth: 320,
            background: "var(--paper)", borderRadius: 24,
            padding: "24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "rgba(224,82,82,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
              }}>
                <AlertTriangle size={24} style={{ color: "#e05252" }} />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>
                Сбросить статистику?
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                Это действие удалит весь прогресс чтения и записи в трекере, но сохранит вашу библиотеку книг.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setResetConfirm(false)}
                disabled={resetting}
                style={{
                  flex: 1, padding: "12px", borderRadius: 14,
                  border: "1px solid var(--line)", background: "var(--paper-soft)",
                  color: "var(--ink)", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleResetStats}
                disabled={resetting}
                style={{
                  flex: 1, padding: "12px", borderRadius: 14,
                  border: "none", background: "#e05252",
                  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  opacity: resetting ? 0.7 : 1,
                }}
              >
                {resetting ? "Сброс..." : "Сбросить"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
