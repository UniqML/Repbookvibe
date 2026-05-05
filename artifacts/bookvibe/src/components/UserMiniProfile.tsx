import { useState, useEffect } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";

interface UserProfile {
  id: number;
  displayName: string;
  avatarSeed: string | null;
  statusText: string | null;
  isOnline: boolean;
  finishedBooks: number;
  totalPages: number;
}

interface FriendStatus {
  state: "none" | "friends" | "pending_out" | "pending_in";
  friendshipId?: number;
}

interface UserMiniProfileProps {
  authorName: string;
  onClose: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function UserMiniProfile({ authorName, onClose }: UserMiniProfileProps) {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>({ state: "none" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(authorName)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        const found: UserProfile | undefined = data.items?.find(
          (u: UserProfile) => u.displayName === authorName
        );
        if (!found) { setLoading(false); return; }
        setProfile(found);

        const fRes = await fetch(`${API_URL}/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fRes.ok) {
          const fData = await fRes.json();
          const isFriend = fData.friends?.find((f: any) => f.id === found.id);
          const isPendingOut = fData.outgoing?.find((f: any) => f.id === found.id);
          const isPendingIn = fData.incoming?.find((f: any) => f.id === found.id);
          if (isFriend) setFriendStatus({ state: "friends", friendshipId: isFriend.friendshipId });
          else if (isPendingOut) setFriendStatus({ state: "pending_out", friendshipId: isPendingOut.friendshipId });
          else if (isPendingIn) setFriendStatus({ state: "pending_in", friendshipId: isPendingIn.friendshipId });
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [authorName, token]);

  const handleAddFriend = async () => {
    if (!profile || !token) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId: profile.id }),
      });
      if (res.ok) setFriendStatus({ state: "pending_out" });
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleAccept = async () => {
    if (!friendStatus.friendshipId || !token) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/friends/accept/${friendStatus.friendshipId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFriendStatus({ state: "friends", friendshipId: friendStatus.friendshipId });
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleRemove = async () => {
    if (!friendStatus.friendshipId || !token) return;
    setBusy(true);
    try {
      await fetch(`${API_URL}/friends/${friendStatus.friendshipId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriendStatus({ state: "none" });
    } catch { /* ignore */ }
    setBusy(false);
  };

  const isMe = user && profile && user.id === profile.id;

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
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <button
            onClick={onClose}
            style={{ border: 0, background: "transparent", color: "var(--muted)", fontSize: 20, cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 14 }}>
            Загрузка...
          </div>
        ) : !profile ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              <UserAvatar seed={authorName} name={authorName} size={72} radius={20} />
            </div>
            <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 18, marginTop: 12 }}>{authorName}</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>Профиль недоступен</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ position: "relative" }}>
                <UserAvatar seed={profile.avatarSeed || profile.displayName} name={profile.displayName} size={72} radius={20} />
                <div style={{
                  position: "absolute", bottom: 4, right: 4,
                  width: 12, height: 12, borderRadius: "50%",
                  background: profile.isOnline ? "#22c55e" : "rgba(0,0,0,0.18)",
                  border: "2px solid var(--paper)",
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 18 }}>{profile.displayName}</div>
                {profile.statusText && (
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2, fontStyle: "italic" }}>
                    {profile.statusText}
                  </div>
                )}
                <div style={{ fontSize: 12, color: profile.isOnline ? "#22c55e" : "var(--muted)", marginTop: 4, fontWeight: 600 }}>
                  {profile.isOnline ? "🟢 онлайн" : "⚪ офлайн"}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "var(--paper-soft)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{profile.finishedBooks}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>книг прочитано</div>
              </div>
              <div style={{ background: "var(--paper-soft)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{profile.totalPages}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>страниц прочитано</div>
              </div>
            </div>

            {!isMe && user && !user.isAnonymous && (
              <div>
                {friendStatus.state === "none" && (
                  <button
                    onClick={handleAddFriend}
                    disabled={busy}
                    style={{
                      width: "100%", border: 0, borderRadius: 16, padding: "13px",
                      background: "var(--accent)", color: "white",
                      fontWeight: 800, fontSize: 15, cursor: busy ? "default" : "pointer",
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    Добавить в друзья
                  </button>
                )}
                {friendStatus.state === "pending_out" && (
                  <button
                    onClick={handleRemove}
                    disabled={busy}
                    style={{
                      width: "100%", border: "1.5px solid var(--accent)", borderRadius: 16, padding: "13px",
                      background: "transparent", color: "var(--accent)",
                      fontWeight: 700, fontSize: 15, cursor: busy ? "default" : "pointer",
                    }}
                  >
                    Заявка отправлена · Отменить
                  </button>
                )}
                {friendStatus.state === "pending_in" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button
                      onClick={handleRemove}
                      disabled={busy}
                      style={{
                        border: "1px solid var(--line)", borderRadius: 14, padding: "12px",
                        background: "transparent", color: "var(--muted)",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      Отклонить
                    </button>
                    <button
                      onClick={handleAccept}
                      disabled={busy}
                      style={{
                        border: 0, borderRadius: 14, padding: "12px",
                        background: "var(--accent)", color: "white",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      Принять
                    </button>
                  </div>
                )}
                {friendStatus.state === "friends" && (
                  <button
                    onClick={handleRemove}
                    disabled={busy}
                    style={{
                      width: "100%", border: "1px solid var(--line)", borderRadius: 16, padding: "13px",
                      background: "var(--paper-soft)", color: "var(--muted)",
                      fontWeight: 700, fontSize: 14, cursor: busy ? "default" : "pointer",
                    }}
                  >
                    ✓ Уже друзья · Удалить
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
