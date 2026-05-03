import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Flag } from "lucide-react";
import {
  useListChatRooms,
  useListChatMessages,
  useSendChatMessage,
  getListChatMessagesQueryKey,
  useReportChatMessage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@/hooks/useAuth";
import { AuthForm } from "@/components/AuthForm";
import { useLanguage } from "@/hooks/useLanguage";
import { UserAvatar } from "@/components/UserAvatar";

interface ChatsTabProps {
  user: User | null;
}

const GENRE_IMAGES: { keywords: string[]; url: string }[] = [
  {
    keywords: ["детектив", "mystery", "detective", "crime", "криминал"],
    url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80",
  },
  {
    keywords: ["романтик", "romance", "love", "любовь", "любов"],
    url: "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?auto=format&fit=crop&w=800&q=80",
  },
  {
    keywords: ["фэнтези", "fantasy", "magic", "магия", "волшебство"],
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
  },
  {
    keywords: ["классик", "classic", "literary", "литератур", "поэзия", "poetry"],
    url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
  },
  {
    keywords: ["ужас", "horror", "триллер", "thriller", "страх"],
    url: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=800&q=80",
  },
  {
    keywords: ["научн", "sci-fi", "science", "космос", "space", "фантастика"],
    url: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=800&q=80",
  },
  {
    keywords: ["приключен", "adventure", "путешест", "travel"],
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  },
  {
    keywords: ["истори", "historical", "history", "ancient", "античн"],
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
  },
  {
    keywords: ["психологи", "psychology", "саморазвити", "self"],
    url: "https://images.unsplash.com/photo-1499914485622-a88fac536970?auto=format&fit=crop&w=800&q=80",
  },
  {
    keywords: ["молодёж", "young adult", "ya ", "подростк"],
    url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
  },
];

const DEFAULT_CHAT_IMAGE =
  "https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=800&q=80";

function getGenreImage(name: string, description?: string): string {
  const text = `${name} ${description || ""}`.toLowerCase();
  for (const entry of GENRE_IMAGES) {
    if (entry.keywords.some((kw) => text.includes(kw))) {
      return entry.url;
    }
  }
  return DEFAULT_CHAT_IMAGE;
}

export function ChatsTab({ user }: ChatsTabProps) {
  const { t } = useLanguage();
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [msgText, setMsgText] = useState("");
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [reportedMsgId, setReportedMsgId] = useState<number | null>(null);

  const { data: roomsData, isLoading: roomsLoading } = useListChatRooms();
  const rooms = roomsData?.items || [];

  const { data: messagesData, isLoading: msgsLoading } = useListChatMessages(
    activeRoom ?? "",
    undefined,
    { query: { enabled: !!activeRoom, refetchInterval: 5000, queryKey: getListChatMessagesQueryKey(activeRoom ?? "") } }
  );
  const messages = messagesData?.items || [];

  const { mutateAsync: sendMsg, isPending: sending } = useSendChatMessage();
  const { mutateAsync: reportMsg } = useReportChatMessage();

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!msgText.trim() || !activeRoom || !user || user.isAnonymous) return;
    try {
      await sendMsg({ roomId: activeRoom, data: { author: user.displayName, author_avatar_seed: user.avatarSeed || user.email || user.displayName, text: msgText.trim() } });
      setMsgText("");
      qc.invalidateQueries({ queryKey: getListChatMessagesQueryKey(activeRoom) });
    } catch { /* ignore */ }
  };

  const handleReport = async (messageId: number) => {
    if (!activeRoom) return;
    try {
      await reportMsg({ roomId: activeRoom, messageId: messageId, data: { reason: "inappropriate" } });
      setReportedMsgId(messageId);
      setTimeout(() => setReportedMsgId(null), 2000);
    } catch { /* ignore */ }
  };

  if (!user) {
    return (
      <div style={{ padding: 18 }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ color: "var(--ink)", margin: "0 0 4px", fontWeight: 700 }}>{t("genreChats")}</h3>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>{t("loginToChat")}</p>
        </div>
        <AuthForm />
      </div>
    );
  }

  if (activeRoom) {
    const room = rooms.find(r => r.id === activeRoom);
    const roomImg = getGenreImage(room?.name || "", room?.description || "");
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 10px",
          borderBottom: "1px solid var(--line)",
          position: "relative", overflow: "hidden",
          background: "var(--paper-soft)",
        }}>
          <img
            src={roomImg}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18, pointerEvents: "none" }}
          />
          <button onClick={() => setActiveRoom(null)} style={{ border: 0, background: "transparent", color: "var(--accent)", cursor: "pointer", padding: 4, display: "flex", position: "relative" }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ position: "relative" }}>
            <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>{room?.name}</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{room?.description}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {msgsLoading && <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center" }}>{t("loading")}</p>}
          {messages.map(msg => {
            const isMe = msg.author === user.displayName;
            return (
              <div key={msg.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                {!isMe && (
                  <UserAvatar seed={msg.author_avatar_seed || msg.author} name={msg.author} size={40} radius={12} />
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  {!isMe && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>{msg.author}</span>
                    </div>
                  )}
                  <div style={{
                    background: isMe ? "var(--accent)" : "var(--paper-soft)",
                    color: isMe ? "white" : "var(--ink)",
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding: "10px 14px",
                    fontSize: 14,
                    border: isMe ? "none" : "1px solid var(--line)",
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                  {!isMe && user && !user.isAnonymous && (
                    <button
                      onClick={() => handleReport(msg.id)}
                      disabled={reportedMsgId === msg.id}
                      title="Пожаловаться"
                      style={{
                        border: 0, background: "transparent", cursor: "pointer",
                        padding: "2px 4px", display: "inline-flex", alignItems: "center", gap: 3,
                        color: reportedMsgId === msg.id ? "var(--accent)" : "var(--muted)",
                        fontSize: 10, marginTop: 2, opacity: 0.7,
                      }}
                    >
                      <Flag size={10} />
                      {reportedMsgId === msg.id ? "Отправлено" : ""}
                    </button>
                  )}
                </div>
                {isMe && (
                  <UserAvatar seed={user.avatarSeed || user.email || user.displayName} name={user.displayName} size={40} radius={12} />
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, background: "var(--paper-soft)" }}>
          {user?.isAnonymous ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.62)", borderRadius: 18, color: "var(--muted)", fontSize: 13 }}>
              Только авторизованные пользователи могут писать сообщения
            </div>
          ) : (
            <>
              <input
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={t("writeMessage")}
                style={{
                  flex: 1, border: "1px solid var(--line)", borderRadius: 18, padding: "10px 14px",
                  background: "rgba(255,255,255,0.62)", color: "var(--ink)", fontSize: 14, outline: "none",
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !msgText.trim()}
                style={{
                  width: 44, height: 44, borderRadius: "50%", border: 0,
                  background: "var(--accent)", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", opacity: sending || !msgText.trim() ? 0.5 : 1,
                }}
              >
                <Send size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "14px 18px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ color: "var(--ink)", margin: "0 0 4px", fontWeight: 700 }}>{t("genreChats")}</h3>
      {roomsLoading && <p style={{ color: "var(--muted)", fontSize: 13 }}>{t("loading")}</p>}
      {rooms.map(room => {
        const img = getGenreImage(room.name, room.description);
        return (
          <button
            key={room.id}
            onClick={() => setActiveRoom(room.id)}
            style={{
              width: "100%", border: "1px solid var(--line)",
              borderRadius: 20, padding: 0, textAlign: "left", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(44,33,27,0.08)",
              overflow: "hidden",
              position: "relative",
              background: "var(--paper-soft)",
            }}
          >
            <img
              src={img}
              alt=""
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover", opacity: 0.28, pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", padding: "14px 16px" }}>
              <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>{room.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 12, margin: "3px 0 6px" }}>{room.description}</div>
              {room.last_message && (
                <div style={{ fontSize: 12, color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 6, marginTop: 4 }}>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>{room.last_message.author}: </span>
                  {room.last_message.text?.slice(0, 60)}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "var(--accent)", background: "color-mix(in srgb, var(--accent-2), white 30%)", padding: "3px 8px", borderRadius: 999 }}>
                  {room.messages} {t("messages")}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
