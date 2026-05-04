import { X, Printer, Download, Share2, Heart } from "lucide-react";
import type { Book } from "@workspace/api-client-react";
import { useRef, useState } from "react";
import { RatingsPanel } from "./RatingsPanel";

interface BookCardModalProps {
  book: Book | null;
  diaryEntry?: any;
  onClose: () => void;
}

export function BookCardModal({ book, diaryEntry, onClose }: BookCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!book) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><style>
          body { font-family: system-ui; padding: 20px; max-width: 600px; margin: 0 auto; }
          h1 { color: #8b5cf6; margin-bottom: 10px; }
          .meta { color: #999; font-size: 14px; margin-bottom: 20px; }
          .rating { color: #f7c52d; font-size: 24px; margin: 10px 0; }
          .section { margin-bottom: 20px; }
          .section-title { color: #333; font-weight: 700; margin-bottom: 8px; }
          .section-content { color: #555; line-height: 1.6; }
          .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
          .tag { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        </style></head><body>
          <h1>${book.title}</h1>
          <div class="meta">${book.author} • ${book.pages} стр.</div>
          ${book.rating ? `<div class="rating">${"★".repeat(Math.round(book.rating))}${" ☆".repeat(5 - Math.round(book.rating))}</div>` : ""}
          ${diaryEntry?.quote ? `<div class="section"><div class="section-title">Цитата</div><div class="section-content">"${diaryEntry.quote}"</div></div>` : ""}
          ${diaryEntry?.note ? `<div class="section"><div class="section-title">Заметка</div><div class="section-content">${diaryEntry.note}</div></div>` : ""}
          ${diaryEntry?.stickers && diaryEntry.stickers.length > 0 ? `<div class="section"><div class="section-title">Стикеры</div><div class="tags">${diaryEntry.stickers.map((s: string) => `<div class="tag">${s}</div>`).join("")}</div></div>` : ""}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default as any;
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.download = `${book.title.replace(/[^\w]/g, "_")}_bookvibe.jpg`;
      link.click();
    } catch (e) {
      alert("Ошибка при скачивании изображения");
    }
  };

  const handleShare = () => {
    const text = `Я прочитал(а) "${book.title}" ${book.author ? `автора ${book.author}` : ""} ${book.rating ? `(оценка: ${Math.round(book.rating)}/5)` : ""}. BookVibe 📚`;

    if (navigator.share) {
      navigator.share({ title: book.title, text });
    } else {
      const options = [
        { name: "Telegram", url: `https://t.me/share/url?url=bookvibe.app&text=${encodeURIComponent(text)}` },
        { name: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(text)}` },
        { name: "VK", url: `https://vk.com/share.php?url=bookvibe.app&title=${encodeURIComponent(book.title)}&description=${encodeURIComponent(text)}` },
      ];

      const shareMenu = options.map(o => `${o.name}`).join("\n");
      const choice = prompt(`Выберите платформу для шеринга:\n${shareMenu}\n(или отмените)`);
      const selected = options.find(o => o.name.toLowerCase().includes(choice?.toLowerCase() || ""));
      if (selected) window.open(selected.url, "_blank");
    }
  };

  const diaryBook = diaryEntry?.book || book;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 50, padding: 16, backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div style={{
        background: "var(--paper)", borderRadius: 24, padding: 20,
        maxWidth: 500, maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", width: "100%",
      }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14,
          width: 32, height: 32, borderRadius: "50%",
          border: 0, background: "rgba(0,0,0,0.08)",
          color: "var(--muted)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={16} />
        </button>

        <div ref={cardRef} style={{
          background: "white", borderRadius: 16, padding: 20,
          marginBottom: 16,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 14, marginBottom: 16 }}>
            <img src={book.cover || ""} alt={book.title}
              style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 10 }} />
            <div>
              <h2 style={{ color: "#1a1a1a", margin: "0 0 4px", fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>
                {book.title}
              </h2>
              <p style={{ color: "#666", margin: "0 0 8px", fontSize: 13 }}>{book.author}</p>
              <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
                {book.pages} стр. • {book.status}
              </div>
              {book.rating ? (
                <div style={{ color: "#f7c52d", fontSize: 18, fontWeight: 800 }}>
                  {"★".repeat(Math.round(book.rating))}{"☆".repeat(5 - Math.round(book.rating))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#ccc" }}>Не оценено</div>
              )}
            </div>
          </div>

          {diaryEntry && (
            <>
              {diaryEntry.quote && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: "#666", fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Цитата
                  </div>
                  <div style={{ color: "#333", fontSize: 13, fontStyle: "italic", lineHeight: 1.5 }}>
                    "{diaryEntry.quote}"
                  </div>
                </div>
              )}

              {diaryEntry.note && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: "#666", fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Заметка
                  </div>
                  <div style={{ color: "#333", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {diaryEntry.note}
                  </div>
                </div>
              )}

              {diaryEntry.stickers && diaryEntry.stickers.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: "#666", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Стикеры
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {diaryEntry.stickers.map((s: string) => (
                      <span key={s} style={{
                        background: "#f0f0f0", color: "#333", padding: "4px 10px",
                        borderRadius: 12, fontSize: 12, fontWeight: 600,
                      }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {diaryEntry.ratings && Object.keys(diaryEntry.ratings).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: "#666", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Оценки
                  </div>
                  {Object.entries(diaryEntry.ratings).map(([key, value]: [string, any]) => (
                    <div key={key} style={{ display: "grid", gridTemplateColumns: "80px 1fr 30px", gap: 10, alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "#666" }}>{key}</span>
                      <div style={{ height: 6, borderRadius: 3, background: "#eee", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(value / 10) * 100}%`, background: "#8b5cf6" }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6" }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <button onClick={handlePrint} style={{
            border: "1px solid var(--line)", background: "transparent",
            borderRadius: 12, padding: "10px 8px",
            color: "var(--muted)", cursor: "pointer", fontWeight: 600, fontSize: 12,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <Printer size={14} />
            Печать
          </button>
          <button onClick={handleDownload} style={{
            border: "1px solid var(--line)", background: "transparent",
            borderRadius: 12, padding: "10px 8px",
            color: "var(--muted)", cursor: "pointer", fontWeight: 600, fontSize: 12,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <Download size={14} />
            JPG
          </button>
          <button onClick={handleShare} style={{
            border: "1px solid var(--line)", background: "transparent",
            borderRadius: 12, padding: "10px 8px",
            color: "var(--muted)", cursor: "pointer", fontWeight: 600, fontSize: 12,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <Share2 size={14} />
            Поделиться
          </button>
        </div>

        <div style={{ padding: "16px 16px", borderTop: "1px solid var(--line)" }}>
          <h4 style={{ color: "var(--ink)", margin: "0 0 12px", fontWeight: 700, fontSize: 14 }}>
            Оценки читателей
          </h4>
          <RatingsPanel
            key={refreshKey}
            bookId={book.id}
            onRatingAdded={() => setRefreshKey(k => k + 1)}
          />
        </div>
      </div>
    </div>
  );
}
