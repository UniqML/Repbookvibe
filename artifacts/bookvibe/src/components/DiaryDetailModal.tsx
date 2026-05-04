import { X, Music, Image as ImageIcon, MessageSquare, FileText, Tag, Star } from "lucide-react";
import type { Book, DiaryEntry } from "@workspace/api-client-react";

interface DiaryDetailModalProps {
  entry: DiaryEntry;
  book: Book | null;
  onClose: () => void;
}

const RATING_LABELS: Record<string, string> = {
  "Сюжет": "📖",
  "Персонажи": "👥",
  "Атмосфера": "🌙",
  "Романтика": "💕",
  "Стекло": "💔",
  "Динамика": "⚡",
};

export function DiaryDetailModal({ entry, book, onClose }: DiaryDetailModalProps) {
  const musicEntries = entry.music ? Object.entries(entry.music) : [];
  const images = entry.images || [];
  const stickers = entry.stickers || [];
  const ratings = entry.ratings ? Object.entries(entry.ratings) : [];
  const hasRatings = ratings.length > 0;
  const hasContent = entry.quote || entry.note || stickers.length > 0 || images.length > 0 || musicEntries.length > 0 || hasRatings;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        zIndex: 60,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--paper)",
          borderRadius: "24px 24px 0 0",
          width: "100%",
          maxWidth: 600,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 -10px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          position: "sticky", top: 0,
          background: "var(--paper)",
          borderBottom: "1px solid var(--line)",
          padding: "16px 18px 14px",
          zIndex: 10,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          {book?.cover && (
            <img
              src={book.cover}
              alt={book?.title}
              style={{ width: 42, height: 63, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, color: "var(--ink)", fontWeight: 800, fontSize: 16, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {book?.title || "Книга"}
            </h3>
            {book?.author && (
              <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 12 }}>{book.author}</p>
            )}
            {book?.rating ? (
              <div style={{ color: "#f7c52d", fontSize: 14, marginTop: 2 }}>
                {"★".repeat(Math.round(book.rating))}{"☆".repeat(5 - Math.round(book.rating))}
              </div>
            ) : null}
            {entry.created_at && (
              <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: 11 }}>
                {formatDate(entry.created_at)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              border: 0, background: "rgba(0,0,0,0.07)",
              borderRadius: "50%", width: 32, height: 32,
              cursor: "pointer", color: "var(--muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 18px 36px", display: "flex", flexDirection: "column", gap: 18 }}>

          {!hasContent && (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)" }}>
              <FileText size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Запись пока пуста</p>
            </div>
          )}

          {/* Quote */}
          {entry.quote && (
            <div style={{
              background: "color-mix(in srgb, var(--accent-2), white 40%)",
              borderLeft: "3px solid var(--accent)",
              borderRadius: "0 14px 14px 0",
              padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <MessageSquare size={13} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Цитата</span>
              </div>
              <p style={{ margin: 0, color: "var(--ink)", fontSize: 14, fontStyle: "italic", lineHeight: 1.6 }}>
                «{entry.quote}»
              </p>
            </div>
          )}

          {/* Note */}
          {entry.note && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <FileText size={13} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Заметки и впечатления</span>
              </div>
              <p style={{ margin: 0, color: "var(--ink)", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {entry.note}
              </p>
            </div>
          )}

          {/* Stickers */}
          {stickers.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Tag size={13} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Стикеры настроения</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {stickers.map((s) => (
                  <span
                    key={s}
                    style={{
                      background: "color-mix(in srgb, var(--accent-2), white 25%)",
                      color: "var(--accent)",
                      padding: "6px 14px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      border: "1px solid color-mix(in srgb, var(--accent-2), white 10%)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ratings bars */}
          {hasRatings && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Star size={13} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Детальные оценки</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ratings.map(([key, value]: [string, any]) => (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: "22px 90px 1fr 28px", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 16 }}>{RATING_LABELS[key] || "⭐"}</span>
                    <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{key}</span>
                    <div style={{ height: 7, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${(value / 10) * 100}%`,
                        background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                        borderRadius: "inherit",
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <ImageIcon size={13} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Изображения к книге</span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: images.length === 1 ? "1fr" : "1fr 1fr",
                gap: 8,
              }}>
                {images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    style={{
                      width: "100%",
                      aspectRatio: images.length === 1 ? "16/9" : "1",
                      objectFit: "cover",
                      borderRadius: 14,
                      display: "block",
                    }}
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Music */}
          {musicEntries.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Music size={13} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Саундтрек к чтению</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {musicEntries.map(([title, artist]) => (
                  <div
                    key={title}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px",
                      background: "var(--paper-soft)",
                      borderRadius: 14,
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Music size={16} color="white" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {artist}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
