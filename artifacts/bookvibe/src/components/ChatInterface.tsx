import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, BookOpen, MoreVertical } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

interface ChatMessage {
  id: string;
  text: string;
  author: string;
  authorAvatarSeed?: string;
  timestamp: Date;
  isMe: boolean;
  bookReference?: {
    title: string;
    author: string;
    cover?: string;
  };
}

interface ChatInterfaceProps {
  roomName: string;
  roomDescription?: string;
  roomImage?: string;
  messages: ChatMessage[];
  currentUser: {
    name: string;
    avatarSeed?: string;
  };
  onSendMessage: (text: string) => void;
  onBack: () => void;
  isSending?: boolean;
  isAnonymous?: boolean;
}

export function ChatInterface({
  roomName,
  roomDescription,
  roomImage,
  messages,
  currentUser,
  onSendMessage,
  onBack,
  isSending = false,
  isAnonymous = false,
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!inputText.trim() || isSending || isAnonymous) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--paper)]">
      {/* Header */}
      <header className="relative flex items-center gap-3 px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden">
        {roomImage && (
          <img
            src={roomImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
          />
        )}
        <button
          onClick={onBack}
          className="relative z-10 p-2 -ml-2 rounded-full text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative z-10 flex-1 min-w-0">
          <h2 className="font-bold text-[var(--ink)] text-[15px] truncate">{roomName}</h2>
          {roomDescription && (
            <p className="text-xs text-[var(--muted)] truncate">{roomDescription}</p>
          )}
        </div>
        <button
          className="relative z-10 p-2 -mr-2 rounded-full text-[var(--muted)] hover:bg-[var(--line)] transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 items-end ${msg.isMe ? "justify-end" : "justify-start"}`}
          >
            {!msg.isMe && (
              <UserAvatar
                seed={msg.authorAvatarSeed || msg.author}
                name={msg.author}
                size={36}
                radius={10}
              />
            )}
            <div
              className={`flex flex-col max-w-[80%] ${
                msg.isMe ? "items-end" : "items-start"
              }`}
            >
              {!msg.isMe && (
                <span className="text-[11px] font-semibold text-[var(--accent)] mb-1 ml-1">
                  {msg.author}
                </span>
              )}

              {/* Book Reference Card */}
              {msg.bookReference && (
                <div className="flex items-center gap-2 p-2 mb-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
                  <div className="w-8 h-12 rounded-md overflow-hidden flex-shrink-0 shadow-sm">
                    <img
                      src={msg.bookReference.cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=100&q=60"}
                      alt={msg.bookReference.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--ink)] truncate">
                      {msg.bookReference.title}
                    </p>
                    <p className="text-[10px] text-[var(--muted)] truncate">
                      {msg.bookReference.author}
                    </p>
                  </div>
                  <BookOpen className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`px-4 py-2.5 text-sm leading-relaxed ${
                  msg.isMe
                    ? "bg-[var(--accent)] text-white rounded-[18px_18px_4px_18px]"
                    : "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] rounded-[18px_18px_18px_4px]"
                }`}
              >
                {msg.text}
              </div>

              <span className="text-[10px] text-[var(--muted)] mt-1 mx-1">
                {formatTime(msg.timestamp)}
              </span>
            </div>
            {msg.isMe && (
              <UserAvatar
                seed={currentUser.avatarSeed || currentUser.name}
                name={currentUser.name}
                size={36}
                radius={10}
              />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)]">
        {isAnonymous ? (
          <div className="flex items-center justify-center px-4 py-3 rounded-2xl bg-white/60 text-[var(--muted)] text-sm">
            Sign in to send messages
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 rounded-2xl border border-[var(--line)] bg-white/60 text-[var(--ink)] text-sm placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !inputText.trim()}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                inputText.trim() && !isSending
                  ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 hover:shadow-xl hover:shadow-[var(--accent)]/40 active:scale-95"
                  : "bg-[var(--line)] text-[var(--muted)] cursor-not-allowed"
              }`}
              aria-label="Send message"
            >
              <Send className={`w-5 h-5 ${isSending ? "animate-pulse" : ""}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
