import { useState, useEffect, useCallback } from "react";
import { Shield, Users, MessageSquare, Trash2, Ban, CheckCircle, LogOut, AlertTriangle, RefreshCw } from "lucide-react";

const ADMIN_API = "/api/admin";
const CHAT_ROOMS = [
  { id: "detective", name: "Детективы" },
  { id: "fantasy", name: "Фэнтези" },
  { id: "romance", name: "Романтика" },
  { id: "heartbreak", name: "Стекло" },
  { id: "academia", name: "Dark academia" },
  { id: "recommendations", name: "Рекомендации" },
];

type Tab = "users" | "chats" | "logs";

interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  isVerified: boolean;
  isBanned: boolean;
  createdAt: string;
}

interface ChatMessage {
  id: number;
  roomId: string;
  author: string;
  text: string;
  sticker: string;
  imageUrl: string;
  createdAt: string;
}

interface ModerationLog {
  id: number;
  userId: number | null;
  roomId: string;
  messageText: string;
  violationType: string;
  matchedTerms: string;
  action: string;
  createdAt: string;
}

function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  return fetch(`${ADMIN_API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
}

export function AdminPanel() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") || "");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [logging, setLogging] = useState(false);
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [selectedRoom, setSelectedRoom] = useState("detective");
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const flash = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(""), 3000); };

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const r = await apiFetch("/users", token);
    if (r.ok) setUsers((await r.json()).items || []);
    setLoading(false);
  }, [token]);

  const loadMessages = useCallback(async (roomId: string) => {
    if (!token) return;
    setLoading(true);
    const r = await apiFetch(`/chats/${roomId}/messages`, token);
    if (r.ok) setMessages((await r.json()).items || []);
    setLoading(false);
  }, [token]);

  const loadLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const r = await apiFetch("/moderation-logs", token);
    if (r.ok) setLogs((await r.json()).items || []);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (tab === "users") loadUsers();
    else if (tab === "chats") loadMessages(selectedRoom);
    else if (tab === "logs") loadLogs();
  }, [tab, token, loadUsers, loadMessages, loadLogs, selectedRoom]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true);
    setLoginError("");
    const r = await fetch(`${ADMIN_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLogging(false);
    if (r.ok) {
      const { token: t } = await r.json();
      sessionStorage.setItem("admin_token", t);
      setToken(t);
    } else {
      setLoginError("Неверный пароль");
    }
  };

  const handleBan = async (userId: number, banned: boolean) => {
    const r = await apiFetch(`/users/${userId}/ban`, token, {
      method: "POST",
      body: JSON.stringify({ banned }),
    });
    if (r.ok) {
      setUsers(u => u.map(x => x.id === userId ? { ...x, isBanned: banned } : x));
      flash(banned ? "Пользователь заблокирован" : "Блокировка снята");
    }
  };

  const handleDeleteMsg = async (msgId: number) => {
    const r = await apiFetch(`/messages/${msgId}`, token, { method: "DELETE" });
    if (r.ok) {
      setMessages(m => m.filter(x => x.id !== msgId));
      flash("Сообщение удалено");
    }
  };

  const handleClearRoom = async (roomId: string) => {
    if (!confirm(`Очистить весь чат «${roomId}»? Это нельзя отменить.`)) return;
    const r = await apiFetch(`/chats/${roomId}`, token, { method: "DELETE" });
    if (r.ok) {
      setMessages([]);
      flash(`Чат ${roomId} очищен`);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setToken("");
  };

  if (!token) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)",
          borderRadius: 24, padding: "40px 36px", width: "100%", maxWidth: 380,
          border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <Shield size={40} color="#a78bfa" style={{ marginBottom: 12 }} />
            <h1 style={{ color: "#fff", margin: 0, fontSize: 22, fontWeight: 800 }}>BookVibe Admin</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: "6px 0 0", fontSize: 13 }}>Панель администратора</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Пароль администратора"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 14,
                outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12,
              }}
            />
            {loginError && (
              <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 10px", textAlign: "center" }}>{loginError}</p>
            )}
            <button
              type="submit"
              disabled={logging}
              style={{
                width: "100%", padding: "12px", borderRadius: 12, border: 0,
                background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              {logging ? "Вход..." : "Войти"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: 10, border: 0, cursor: "pointer",
    background: active ? "#7c3aed" : "rgba(255,255,255,0.07)",
    color: active ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 13,
    transition: "all 0.15s",
  });

  return (
    <div style={{
      minHeight: "100vh", background: "#0d0d1a", color: "#fff",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 24px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <Shield size={22} color="#a78bfa" />
        <span style={{ fontWeight: 800, fontSize: 16 }}>BookVibe Admin</span>
        <div style={{ flex: 1 }} />
        {actionMsg && (
          <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>✓ {actionMsg}</span>
        )}
        <button onClick={handleLogout} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
          borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
          background: "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13,
        }}>
          <LogOut size={14} />
          Выйти
        </button>
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button style={tabStyle(tab === "users")} onClick={() => setTab("users")}>
            <Users size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />Пользователи
          </button>
          <button style={tabStyle(tab === "chats")} onClick={() => setTab("chats")}>
            <MessageSquare size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />Чаты
          </button>
          <button style={tabStyle(tab === "logs")} onClick={() => setTab("logs")}>
            <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />Нарушения
          </button>
        </div>

        {/* USERS TAB */}
        {tab === "users" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Пользователи ({users.length})
              </h2>
              <button onClick={loadUsers} style={{ background: "transparent", border: 0, color: "#a78bfa", cursor: "pointer" }}>
                <RefreshCw size={16} />
              </button>
            </div>
            {loading ? (
              <p style={{ color: "rgba(255,255,255,0.4)" }}>Загрузка...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {users.map(u => (
                  <div key={u.id} style={{
                    display: "grid", gridTemplateColumns: "1fr auto auto auto",
                    gap: 12, alignItems: "center",
                    background: u.isBanned ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${u.isBanned ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 12, padding: "12px 16px",
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName}</div>
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{u.email}</div>
                      <div style={{ marginTop: 3, display: "flex", gap: 6 }}>
                        <span style={{ fontSize: 11, color: u.isVerified ? "#4ade80" : "#fb923c" }}>
                          {u.isVerified ? "✓ Верифицирован" : "⚠ Не верифицирован"}
                        </span>
                        {u.isBanned && (
                          <span style={{ fontSize: 11, color: "#f87171" }}>🚫 Забанен</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                      #{u.id}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>
                      {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                    <button
                      onClick={() => handleBan(u.id, !u.isBanned)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 12px", borderRadius: 8, border: 0, cursor: "pointer",
                        background: u.isBanned ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
                        color: u.isBanned ? "#4ade80" : "#f87171",
                        fontWeight: 700, fontSize: 12, whiteSpace: "nowrap",
                      }}
                    >
                      {u.isBanned ? <><CheckCircle size={13} /> Разбанить</> : <><Ban size={13} /> Забанить</>}
                    </button>
                  </div>
                ))}
                {users.length === 0 && (
                  <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0" }}>
                    Пользователей пока нет
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* CHATS TAB */}
        {tab === "chats" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Сообщения чата</h2>
              <select
                value={selectedRoom}
                onChange={e => { setSelectedRoom(e.target.value); loadMessages(e.target.value); }}
                style={{
                  background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer", outline: "none",
                }}
              >
                {CHAT_ROOMS.map(r => <option key={r.id} value={r.id} style={{ background: "#1a1a2e" }}>{r.name}</option>)}
              </select>
              <button onClick={() => loadMessages(selectedRoom)} style={{ background: "transparent", border: 0, color: "#a78bfa", cursor: "pointer" }}>
                <RefreshCw size={16} />
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => handleClearRoom(selectedRoom)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.4)",
                  background: "rgba(239,68,68,0.1)", color: "#f87171",
                  cursor: "pointer", fontWeight: 700, fontSize: 13,
                }}
              >
                <Trash2 size={14} /> Очистить весь чат
              </button>
            </div>
            {loading ? (
              <p style={{ color: "rgba(255,255,255,0.4)" }}>Загрузка...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {messages.map(m => (
                  <div key={m.id} style={{
                    display: "grid", gridTemplateColumns: "1fr auto",
                    gap: 12, alignItems: "start",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "10px 14px",
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#a78bfa", marginBottom: 3 }}>
                        {m.author}
                        <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, fontSize: 11, marginLeft: 8 }}>
                          #{m.id} · {new Date(m.createdAt).toLocaleString("ru-RU")}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
                        {m.text || m.sticker || "[изображение]"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMsg(m.id)}
                      style={{
                        padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)",
                        background: "rgba(239,68,68,0.1)", color: "#f87171",
                        cursor: "pointer", fontWeight: 700, fontSize: 12,
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      <Trash2 size={12} /> Удалить
                    </button>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0" }}>
                    Сообщений нет
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* LOGS TAB */}
        {tab === "logs" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Лог нарушений ({logs.length})
              </h2>
              <button onClick={loadLogs} style={{ background: "transparent", border: 0, color: "#a78bfa", cursor: "pointer" }}>
                <RefreshCw size={16} />
              </button>
            </div>
            {loading ? (
              <p style={{ color: "rgba(255,255,255,0.4)" }}>Загрузка...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {logs.map(l => (
                  <div key={l.id} style={{
                    background: l.violationType === "adult_content"
                      ? "rgba(239,68,68,0.08)" : "rgba(251,146,60,0.06)",
                    border: `1px solid ${l.violationType === "adult_content" ? "rgba(239,68,68,0.25)" : "rgba(251,146,60,0.2)"}`,
                    borderRadius: 10, padding: "10px 14px",
                  }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: l.violationType === "adult_content" ? "#f87171" : "#fb923c", fontWeight: 700, textTransform: "uppercase" }}>
                        {l.violationType}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>чат: {l.roomId}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        {l.userId ? `user #${l.userId}` : "гость"}
                      </span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
                        {new Date(l.createdAt).toLocaleString("ru-RU")}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
                      <b>Оригинал:</b> {l.messageText}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      Слова: {l.matchedTerms} · Действие: {l.action}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0" }}>
                    Нарушений не зарегистрировано
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
