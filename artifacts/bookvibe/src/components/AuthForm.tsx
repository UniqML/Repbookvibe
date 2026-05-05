import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthState } from "@/hooks/useAuth";
import { AlertCircle } from "lucide-react";
import { LegalModal } from "@/components/LegalModal";

type Mode = "login" | "register" | "verify" | "forgot" | "reset";

export function AuthForm() {
  const { loginGuest, register, verifyCode, loginEmail } = useAuth();
  const { user } = useAuthState();

  const [mode, setMode] = useState<Mode>(() => {
    try {
      const saved = localStorage.getItem("bookvibe_auth_mode");
      return (saved as Mode) || "login";
    } catch {
      return "login";
    }
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem("bookvibe_auth_email") || localStorage.getItem("bookvibe_remember_email") || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState(() => {
    try {
      return localStorage.getItem("bookvibe_remember_password") || "";
    } catch {
      return "";
    }
  });
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem("bookvibe_remember_me") === "true";
    } catch {
      return false;
    }
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalDoc, setLegalDoc] = useState<"terms" | "privacy" | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("bookvibe_auth_mode", mode);
      localStorage.setItem("bookvibe_auth_email", email);
    } catch {
      // localStorage not available
    }
  }, [mode, email]);

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loginGuest();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Guest login failed");
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Необходимо принять условия использования");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(email, password, name.trim() || email.split("@")[0]);
      localStorage.setItem("bookvibe_auth_email", email);
      localStorage.setItem("bookvibe_auth_mode", "verify");
      setMode("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await verifyCode(email, code);
      localStorage.removeItem("bookvibe_auth_email");
      localStorage.removeItem("bookvibe_auth_mode");
      if (rememberMe) {
        try {
          localStorage.setItem("bookvibe_remember_email", email);
          localStorage.setItem("bookvibe_remember_password", password);
        } catch {
          // localStorage not available
        }
      }
      setMode("login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loginEmail(email, password);
      try {
        if (rememberMe) {
          localStorage.setItem("bookvibe_remember_email", email);
          localStorage.setItem("bookvibe_remember_password", password);
        } else {
          localStorage.removeItem("bookvibe_remember_email");
          localStorage.removeItem("bookvibe_remember_password");
        }
      } catch {
        // localStorage not available
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("bookvibe_auth_email", email);
      localStorage.setItem("bookvibe_auth_mode", "reset");
      setMode("reset");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset code");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.removeItem("bookvibe_auth_email");
      localStorage.removeItem("bookvibe_auth_mode");
      setMode("login");
      setEmail("");
      setCode("");
      setNewPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--line)",
    borderRadius: 14,
    padding: "10px 12px",
    background: "rgba(255,255,255,0.65)",
    color: "var(--ink)",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <>
      {legalDoc && (
        <LegalModal type={legalDoc} onClose={() => setLegalDoc(null)} />
      )}

      <div style={{
        border: "1px solid var(--line)",
        background: "var(--paper-soft)",
        borderRadius: 24,
        padding: 18,
        boxShadow: "0 8px 24px rgba(44,33,27,0.08)",
      }}>
        <h3 style={{ color: "var(--ink)", margin: "0 0 14px", fontWeight: 700 }}>
          {mode === "login" ? "Войти в BookVibe" : mode === "register" ? "Регистрация" : mode === "forgot" ? "Восстановление пароля" : mode === "reset" ? "Новый пароль" : "Подтверждение кода"}
        </h3>

        {error && (
          <div style={{
            background: "rgba(255, 0, 0, 0.1)",
            border: "1px solid rgba(255, 0, 0, 0.3)",
            borderRadius: 12,
            padding: 10,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#cc0000",
            fontSize: 13,
          }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {mode === "reset" ? (
          <form onSubmit={handleResetPassword} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
              Код отправлен на {email}
            </div>
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Введите код"
              maxLength={6}
              style={{ ...inputStyle, letterSpacing: "0.2em" }}
            />
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6 || !newPassword}
              style={{
                border: 0, borderRadius: 999, padding: "12px 10px",
                background: code.length === 6 && newPassword ? "var(--accent)" : "var(--line)",
                color: code.length === 6 && newPassword ? "white" : "var(--muted)",
                fontWeight: 700, fontSize: 14,
                cursor: code.length === 6 && newPassword ? "pointer" : "default",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Обновляю..." : "Обновить пароль"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setEmail("");
                setCode("");
                setNewPassword("");
                localStorage.removeItem("bookvibe_auth_email");
                localStorage.removeItem("bookvibe_auth_mode");
              }}
              style={{ border: 0, background: "transparent", color: "var(--accent)", fontSize: 13, cursor: "pointer", padding: "6px 0" }}
            >
              Вернуться к входу
            </button>
          </form>
        ) : mode === "forgot" ? (
          <form onSubmit={handleForgotPassword} style={{ display: "grid", gap: 10 }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={inputStyle} />
            <button
              type="submit"
              disabled={loading}
              style={{ border: 0, borderRadius: 999, padding: "12px 10px", background: "var(--accent)", color: "white", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Отправляю..." : "Отправить код"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setEmail("");
                localStorage.removeItem("bookvibe_auth_email");
                localStorage.removeItem("bookvibe_auth_mode");
              }}
              style={{ border: 0, background: "transparent", color: "var(--accent)", fontSize: 13, cursor: "pointer", padding: "6px 0" }}
            >
              Вернуться к входу
            </button>
          </form>
        ) : mode === "verify" ? (
          <form onSubmit={handleVerify} style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
              Код подтверждения отправлен на {email}
            </div>
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Введите 6-значный код"
              maxLength={6}
              style={{ ...inputStyle, letterSpacing: "0.2em" }}
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              style={{
                border: 0, borderRadius: 999, padding: "12px 10px",
                background: code.length === 6 ? "var(--accent)" : "var(--line)",
                color: code.length === 6 ? "white" : "var(--muted)",
                fontWeight: 700, fontSize: 14,
                cursor: code.length === 6 ? "pointer" : "default",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Проверяю..." : "Подтвердить"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
                localStorage.setItem("bookvibe_auth_mode", "register");
              }}
              style={{ border: 0, background: "transparent", color: "var(--accent)", fontSize: 13, cursor: "pointer", padding: "6px 0" }}
            >
              Вернуться к регистрации
            </button>
          </form>
        ) : mode === "login" ? (
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={inputStyle} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" required style={inputStyle} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ cursor: "pointer", width: 18, height: 18 }}
              />
              <span style={{ color: "var(--ink)" }}>Запомнить меня</span>
            </label>
            <button
              type="submit"
              disabled={loading}
              style={{ border: 0, borderRadius: 999, padding: "12px 10px", background: "var(--accent)", color: "white", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: "grid", gap: 10 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя (опционально)" style={inputStyle} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={inputStyle} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" required style={inputStyle} />

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => { setTermsAccepted(e.target.checked); if (e.target.checked) setError(""); }}
                style={{ cursor: "pointer", width: 18, height: 18, marginTop: 1, flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>
                Принимаю{" "}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setLegalDoc("terms"); }}
                  style={{ border: 0, background: "transparent", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  Условия использования
                </button>
                {" "}и{" "}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setLegalDoc("privacy"); }}
                  style={{ border: 0, background: "transparent", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  Политику конфиденциальности
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !termsAccepted}
              style={{
                border: 0, borderRadius: 999, padding: "12px 10px",
                background: termsAccepted ? "var(--accent)" : "var(--line)",
                color: termsAccepted ? "white" : "var(--muted)",
                fontWeight: 700, fontSize: 14,
                cursor: termsAccepted && !loading ? "pointer" : "default",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </button>
          </form>
        )}

        {mode !== "verify" && mode !== "reset" && mode !== "forgot" && (
          <>
            <button
              onClick={handleGuestLogin}
              disabled={loading}
              style={{
                width: "100%", marginTop: 8, border: "1px solid var(--line)",
                borderRadius: 999, padding: "10px",
                background: "transparent", color: "var(--muted)",
                fontSize: 13, cursor: loading ? "default" : "pointer",
              }}
            >
              Войти гостем
            </button>
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(""); localStorage.setItem("bookvibe_auth_mode", "register"); }}
                  style={{ width: "100%", marginTop: 6, border: 0, background: "transparent", color: "var(--accent)", fontSize: 13, cursor: "pointer", padding: "6px 0" }}
                >
                  Создать аккаунт
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); setPassword(""); localStorage.setItem("bookvibe_auth_mode", "forgot"); }}
                  style={{ width: "100%", marginTop: 4, border: 0, background: "transparent", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: "4px 0" }}
                >
                  Забыли пароль?
                </button>
              </>
            )}
            {mode === "register" && (
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); localStorage.removeItem("bookvibe_auth_email"); localStorage.removeItem("bookvibe_auth_mode"); }}
                style={{ width: "100%", marginTop: 6, border: 0, background: "transparent", color: "var(--accent)", fontSize: 13, cursor: "pointer", padding: "6px 0" }}
              >
                Уже есть аккаунт? Войти
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
