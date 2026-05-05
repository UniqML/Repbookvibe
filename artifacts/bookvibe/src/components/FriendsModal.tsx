import { useState, useEffect, useCallback } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface FriendUser {
  id: number;
  displayName: string;
  avatarSeed: string | null;
  statusText: string | null;
  isOnline: boolean;
  friendshipId: number;
}

interface SearchUser {
  id: number;
  displayName: string;
  avatarSeed: string | null;
  statusText: string | null;
  isOnline: boolean;
}

type FriendState = "none" | "friends" | "pending_out" | "pending_in";

interface SearchUserWithState extends SearchUser {
  _state: FriendState;
}

interface FriendsData {
  friends: FriendUser[];
  incoming: FriendUser[];
  outgoing: FriendUser[];
}

interface FriendsModalProps {
  onClose: () => void;
}

export function FriendsModal({ onClose }: FriendsModalProps) {
  const { token } = useAuth();
  const [tab, setTab] = useState<"friends" | "search" | "requests">("friends");
  const [data, setData] = useState<FriendsData>({ friends: [], incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserWithState[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const loadFriends = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json() as FriendsData;
        setData(d);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadFriends();
    const id = setInterval(loadFriends, 30_000);
    return () => clearInterval(id);
  }, [loadFriends]);

  const handleSearch = async () => {
    if (!searchQ.trim() || !token) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(searchQ.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json() as { items: SearchUser[] };
        const results: SearchUserWithState[] = d.items.map((u) => {
          const isFriend = data.friends.find((f) => f.id === u.id);
          const isOut = data.outgoing.find((f) => f.id === u.id);
          const isIn = data.incoming.find((f) => f.id === u.id);
          const state: FriendState = isFriend ? "friends" : isOut ? "pending_out" : isIn ? "pending_in" : "none";
          return { ...u, _state: state };
        });
        setSearchResults(results);
      }
    } catch { /* ignore */ }
    setSearching(false);
  };

  const handleAddFriend = async (friendId: number) => {
    if (!token) return;
    setBusy(friendId);
    try {
      const res = await fetch(`${API_URL}/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId }),
      });
      if (res.ok) {
        setSearchResults(prev => prev.map(u => u.id === friendId ? { ...u, _state: "pending_out" as FriendState } : u));
      }
    } catch { /* ignore */ }
    setBusy(null);
  };

  const handleAccept = async (friendshipId: number) => {
    if (!token) return;
    setBusy(friendshipId);
    try {
      const res = await fetch(`${API_URL}/friends/accept/${friendshipId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await loadFriends();
    } catch { /* ignore */ }
    setBusy(null);
  };

  const handleRemove = async (friendshipId: number) => {
    if (!token) return;
    setBusy(friendshipId);
    try {
      await fetch(`${API_URL}/friends/${friendshipId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadFriends();
    } catch { /* ignore */ }
    setBusy(null);
  };

  const requestCount = data.incoming.length;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 480,
          background: "var(--paper)", borderRadius: "28px 28px 0 0",
          padding: "20px 20px 36px",
          boxShadow: "0 -8px 40px rgba(44,33,27,0.2)",
          maxHeight: "85dvh", display: "flex", flexDirection: "column",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "var(--ink)" }}>Друзья</h3>
          <button
            onClick={onClose}
            style={{ border: 0, background: "transparent", color: "var(--muted)", fontSize: 20, cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["friends", "search", "requests"] as const).map(t => {
            const label = t === "friends" ? "Друзья" : t === "search" ? "Поиск" : `Заявки${requestCount > 0 ? ` (${requestCount})` : ""}`;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, border: tab === t ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                  borderRadius: 12, padding: "8px 4px",
                  background: tab === t ? "color-mix(in srgb, var(--accent), white 88%)" : "transparent",
                  color: tab === t ? "var(--accent)" : "var(--muted)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "friends" && (
            loading ? (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: "24px 0", fontSize: 13 }}>Загрузка...</div>
            ) : data.friends.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                У вас пока нет друзей. Найдите их через поиск!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.friends.map(f => (
                  <FriendRow
                    key={f.id}
                    friend={f}
                    action={
                      <button
                        onClick={() => handleRemove(f.friendshipId)}
                        disabled={busy === f.friendshipId}
                        style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "6px 10px", background: "transparent", color: "var(--muted)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                      >
                        Удалить
                      </button>
                    }
                  />
                ))}
              </div>
            )
          )}

          {tab === "search" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Имя пользователя..."
                  style={{
                    flex: 1, border: "1px solid var(--line)", borderRadius: 14,
                    padding: "10px 14px", fontSize: 14, color: "var(--ink)",
                    background: "rgba(255,255,255,0.6)", outline: "none",
                  }}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchQ.trim()}
                  style={{
                    border: 0, borderRadius: 14, padding: "10px 16px",
                    background: "var(--accent)", color: "white",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                    opacity: searching || !searchQ.trim() ? 0.5 : 1,
                  }}
                >
                  Найти
                </button>
              </div>
              {searching ? (
                <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Поиск...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {searchResults.map(u => (
                    <FriendRow
                      key={u.id}
                      friend={{ ...u, friendshipId: 0 }}
                      action={
                        u._state === "none" ? (
                          <button
                            onClick={() => handleAddFriend(u.id)}
                            disabled={busy === u.id}
                            style={{ border: 0, borderRadius: 10, padding: "6px 12px", background: "var(--accent)", color: "white", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                          >
                            + Добавить
                          </button>
                        ) : u._state === "friends" ? (
                          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>✓ Друг</span>
                        ) : u._state === "pending_out" ? (
                          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Отправлено</span>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Входящая</span>
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "requests" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {data.incoming.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>Входящие</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.incoming.map(f => (
                      <FriendRow
                        key={f.id}
                        friend={f}
                        action={
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => handleRemove(f.friendshipId)}
                              disabled={busy === f.friendshipId}
                              style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "6px 10px", background: "transparent", color: "var(--muted)", fontSize: 11, cursor: "pointer" }}
                            >
                              ✕
                            </button>
                            <button
                              onClick={() => handleAccept(f.friendshipId)}
                              disabled={busy === f.friendshipId}
                              style={{ border: 0, borderRadius: 10, padding: "6px 12px", background: "var(--accent)", color: "white", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                            >
                              ✓ Принять
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
              {data.outgoing.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>Исходящие</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.outgoing.map(f => (
                      <FriendRow
                        key={f.id}
                        friend={f}
                        action={
                          <button
                            onClick={() => handleRemove(f.friendshipId)}
                            disabled={busy === f.friendshipId}
                            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "6px 10px", background: "transparent", color: "var(--muted)", fontSize: 11, cursor: "pointer" }}
                          >
                            Отменить
                          </button>
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
              {data.incoming.length === 0 && data.outgoing.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0", fontSize: 13 }}>
                  Нет активных заявок
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FriendRow({ friend, action }: { friend: FriendUser; action: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16, background: "var(--paper-soft)", border: "1px solid var(--line)" }}>
      <div style={{ position: "relative" }}>
        <UserAvatar seed={friend.avatarSeed || friend.displayName} name={friend.displayName} size={40} radius={12} />
        <div style={{
          position: "absolute", bottom: 2, right: 2,
          width: 10, height: 10, borderRadius: "50%",
          background: friend.isOnline ? "#22c55e" : "rgba(0,0,0,0.18)",
          border: "2px solid var(--paper-soft)",
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>{friend.displayName}</div>
        {friend.statusText ? (
          <div style={{ color: "var(--muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{friend.statusText}</div>
        ) : (
          <div style={{ color: friend.isOnline ? "#22c55e" : "var(--muted)", fontSize: 11 }}>
            {friend.isOnline ? "онлайн" : "офлайн"}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
