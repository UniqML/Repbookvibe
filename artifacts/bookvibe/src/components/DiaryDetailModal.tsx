import { useRef, useState } from "react";
import { X, Music, Image as ImageIcon, MessageSquare, FileText, Tag, Star, Share2, Download } from "lucide-react";
import type { Book, DiaryEntry } from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";

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

// Fixed colors for html2canvas (no CSS variables)
const C = {
  paper: "#f9f3eb",
  paperSoft: "#f3ebe0",
  accent: "#b8895d",
  accent2: "#d4a574",
  ink: "#2c1810",
  muted: "#8b7355",
  line: "rgba(184,137,93,0.2)",
  quoteBlock: "#f0e4d4",
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

// Convert image URL to base64 via canvas (needed for html2canvas cross-origin)
async function toBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url; // fallback to original URL
  }
}

async function buildCardElement(entry: DiaryEntry, book: Book | null): Promise<HTMLElement> {
  const musicEntries = entry.music ? Object.entries(entry.music) : [];
  const images = entry.images || [];
  const stickers = entry.stickers || [];
  const ratings = entry.ratings ? Object.entries(entry.ratings) : [];

  // Pre-load images as base64
  const [coverB64, ...imgB64s] = await Promise.all([
    book?.cover ? toBase64(book.cover) : Promise.resolve(""),
    ...images.map(toBase64),
  ]);

  const card = document.createElement("div");
  card.style.cssText = `
    width: 800px;
    background: ${C.paper};
    font-family: 'Georgia', 'Times New Roman', serif;
    padding: 48px 52px 56px;
    box-sizing: border-box;
    position: relative;
  `;

  // Decorative top border
  const topBar = document.createElement("div");
  topBar.style.cssText = `height: 4px; background: linear-gradient(90deg, ${C.accent}, ${C.accent2}); border-radius: 2px; margin-bottom: 36px;`;
  card.appendChild(topBar);

  // Header: cover + book info
  const header = document.createElement("div");
  header.style.cssText = `display: flex; gap: 24px; align-items: flex-start; margin-bottom: 36px;`;

  if (coverB64) {
    const coverImg = document.createElement("img");
    coverImg.src = coverB64;
    coverImg.style.cssText = `width: 90px; height: 135px; object-fit: cover; border-radius: 10px; flex-shrink: 0; box-shadow: 0 6px 20px rgba(44,24,16,0.2);`;
    header.appendChild(coverImg);
  }

  const bookInfo = document.createElement("div");
  bookInfo.style.cssText = `flex: 1; min-width: 0;`;

  const titleEl = document.createElement("div");
  titleEl.style.cssText = `font-size: 26px; font-weight: 800; color: ${C.ink}; line-height: 1.2; margin-bottom: 6px; font-family: Georgia, serif;`;
  titleEl.textContent = book?.title || "Книга";
  bookInfo.appendChild(titleEl);

  if (book?.author) {
    const authorEl = document.createElement("div");
    authorEl.style.cssText = `font-size: 15px; color: ${C.muted}; margin-bottom: 10px; font-style: italic;`;
    authorEl.textContent = book.author;
    bookInfo.appendChild(authorEl);
  }

  if (book?.rating && book.rating > 0) {
    const starsEl = document.createElement("div");
    starsEl.style.cssText = `font-size: 18px; color: #f7c52d; letter-spacing: 2px; margin-bottom: 8px;`;
    starsEl.textContent = "★".repeat(Math.round(book.rating)) + "☆".repeat(5 - Math.round(book.rating));
    bookInfo.appendChild(starsEl);
  }

  if (entry.created_at) {
    const dateEl = document.createElement("div");
    dateEl.style.cssText = `font-size: 13px; color: ${C.muted};`;
    dateEl.textContent = formatDate(entry.created_at);
    bookInfo.appendChild(dateEl);
  }

  header.appendChild(bookInfo);
  card.appendChild(header);

  // Divider
  const addDivider = () => {
    const d = document.createElement("div");
    d.style.cssText = `height: 1px; background: ${C.line}; margin: 24px 0;`;
    card.appendChild(d);
  };

  // Quote
  if (entry.quote) {
    const quoteBlock = document.createElement("div");
    quoteBlock.style.cssText = `
      background: ${C.quoteBlock};
      border-left: 4px solid ${C.accent};
      border-radius: 0 14px 14px 0;
      padding: 18px 22px;
      margin-bottom: 8px;
    `;
    const quoteLabel = document.createElement("div");
    quoteLabel.style.cssText = `font-size: 11px; font-weight: 700; color: ${C.accent}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; font-family: system-ui, sans-serif;`;
    quoteLabel.textContent = "✦ ЦИТАТА";
    quoteBlock.appendChild(quoteLabel);
    const quoteText = document.createElement("p");
    quoteText.style.cssText = `margin: 0; color: ${C.ink}; font-size: 16px; font-style: italic; line-height: 1.7;`;
    quoteText.textContent = `«${entry.quote}»`;
    quoteBlock.appendChild(quoteText);
    card.appendChild(quoteBlock);
  }

  // Note
  if (entry.note) {
    addDivider();
    const noteLabel = document.createElement("div");
    noteLabel.style.cssText = `font-size: 11px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; font-family: system-ui, sans-serif;`;
    noteLabel.textContent = "ЗАМЕТКИ И ВПЕЧАТЛЕНИЯ";
    card.appendChild(noteLabel);
    const noteText = document.createElement("p");
    noteText.style.cssText = `margin: 0; color: ${C.ink}; font-size: 15px; line-height: 1.8; white-space: pre-wrap;`;
    noteText.textContent = entry.note;
    card.appendChild(noteText);
  }

  // Stickers
  if (stickers.length > 0) {
    addDivider();
    const sLabel = document.createElement("div");
    sLabel.style.cssText = `font-size: 11px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; font-family: system-ui, sans-serif;`;
    sLabel.textContent = "СТИКЕРЫ НАСТРОЕНИЯ";
    card.appendChild(sLabel);
    const sRow = document.createElement("div");
    sRow.style.cssText = `display: flex; flex-wrap: wrap; gap: 8px;`;
    stickers.forEach(s => {
      const pill = document.createElement("span");
      pill.style.cssText = `background: ${C.quoteBlock}; color: ${C.accent}; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 700; border: 1px solid ${C.accent2}; font-family: system-ui, sans-serif;`;
      pill.textContent = s;
      sRow.appendChild(pill);
    });
    card.appendChild(sRow);
  }

  // Ratings
  if (ratings.length > 0) {
    addDivider();
    const rLabel = document.createElement("div");
    rLabel.style.cssText = `font-size: 11px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; font-family: system-ui, sans-serif;`;
    rLabel.textContent = "ДЕТАЛЬНЫЕ ОЦЕНКИ";
    card.appendChild(rLabel);
    const rGrid = document.createElement("div");
    rGrid.style.cssText = `display: flex; flex-direction: column; gap: 10px;`;
    ratings.forEach(([key, value]) => {
      const row = document.createElement("div");
      row.style.cssText = `display: grid; grid-template-columns: 26px 120px 1fr 36px; gap: 10px; align-items: center; font-family: system-ui, sans-serif;`;
      const emoji = document.createElement("span");
      emoji.style.fontSize = "18px";
      emoji.textContent = RATING_LABELS[key as string] || "⭐";
      const label = document.createElement("span");
      label.style.cssText = `font-size: 13px; color: ${C.ink}; font-weight: 600;`;
      label.textContent = key as string;
      const barWrap = document.createElement("div");
      barWrap.style.cssText = `height: 8px; border-radius: 999px; background: rgba(44,24,16,0.1); overflow: hidden;`;
      const barFill = document.createElement("div");
      barFill.style.cssText = `height: 100%; border-radius: inherit; background: linear-gradient(90deg, ${C.accent}, ${C.accent2}); width: ${(Number(value) / 10) * 100}%;`;
      barWrap.appendChild(barFill);
      const val = document.createElement("span");
      val.style.cssText = `font-size: 13px; font-weight: 700; color: ${C.accent}; text-align: right;`;
      val.textContent = String(value);
      row.appendChild(emoji); row.appendChild(label); row.appendChild(barWrap); row.appendChild(val);
      rGrid.appendChild(row);
    });
    card.appendChild(rGrid);
  }

  // Images
  if (imgB64s.length > 0) {
    addDivider();
    const iLabel = document.createElement("div");
    iLabel.style.cssText = `font-size: 11px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; font-family: system-ui, sans-serif;`;
    iLabel.textContent = "ИЗОБРАЖЕНИЯ К КНИГЕ";
    card.appendChild(iLabel);
    const iGrid = document.createElement("div");
    const cols = imgB64s.length === 1 ? 1 : imgB64s.length <= 4 ? 2 : 3;
    iGrid.style.cssText = `display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 10px;`;
    imgB64s.forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      img.style.cssText = `width: 100%; aspect-ratio: ${cols === 1 ? "16/9" : "1"}; object-fit: cover; border-radius: 12px;`;
      iGrid.appendChild(img);
    });
    card.appendChild(iGrid);
  }

  // Music
  if (musicEntries.length > 0) {
    addDivider();
    const mLabel = document.createElement("div");
    mLabel.style.cssText = `font-size: 11px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; font-family: system-ui, sans-serif;`;
    mLabel.textContent = "🎵 САУНДТРЕК К ЧТЕНИЮ";
    card.appendChild(mLabel);
    const mList = document.createElement("div");
    mList.style.cssText = `display: flex; flex-direction: column; gap: 8px;`;
    musicEntries.forEach(([title, artist]) => {
      const row = document.createElement("div");
      row.style.cssText = `display: flex; align-items: center; gap: 14px; padding: 10px 16px; background: ${C.paperSoft}; border-radius: 12px; border: 1px solid ${C.line};`;
      const dot = document.createElement("div");
      dot.style.cssText = `width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, ${C.accent}, ${C.accent2}); flex-shrink: 0; display: flex; align-items: center; justify-content: center;`;
      dot.textContent = "♪";
      dot.style.color = "#fff";
      dot.style.fontSize = "18px";
      const info = document.createElement("div");
      info.style.cssText = `min-width: 0;`;
      const titleEl2 = document.createElement("div");
      titleEl2.style.cssText = `font-weight: 700; font-size: 14px; color: ${C.ink}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: system-ui, sans-serif;`;
      titleEl2.textContent = title;
      const artistEl = document.createElement("div");
      artistEl.style.cssText = `font-size: 12px; color: ${C.muted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: system-ui, sans-serif;`;
      artistEl.textContent = artist as string;
      info.appendChild(titleEl2); info.appendChild(artistEl);
      row.appendChild(dot); row.appendChild(info);
      mList.appendChild(row);
    });
    card.appendChild(mList);
  }

  // Stats block
  const hasStats = book?.pages || book?.read_pages || entry.created_at;
  if (hasStats) {
    addDivider();
    const statsRow = document.createElement("div");
    statsRow.style.cssText = `display: flex; gap: 16px;`;
    const statItems = [
      book?.pages ? { icon: "📄", label: "Всего страниц", value: String(book.pages) } : null,
      book?.read_pages ? { icon: "✓", label: "Прочитано", value: `${book.read_pages} стр.` } : null,
      entry.created_at ? { icon: "📅", label: "Дата записи", value: formatDate(entry.created_at) } : null,
    ].filter(Boolean) as { icon: string; label: string; value: string }[];
    statItems.forEach(s => {
      const box = document.createElement("div");
      box.style.cssText = `flex: 1; background: ${C.paperSoft}; border: 1px solid ${C.line}; border-radius: 12px; padding: 14px 16px; font-family: system-ui, sans-serif;`;
      const icon = document.createElement("div");
      icon.style.cssText = `font-size: 20px; margin-bottom: 6px;`;
      icon.textContent = s.icon;
      const val = document.createElement("div");
      val.style.cssText = `font-size: 16px; font-weight: 800; color: ${C.accent}; margin-bottom: 2px;`;
      val.textContent = s.value;
      const lbl = document.createElement("div");
      lbl.style.cssText = `font-size: 11px; color: ${C.muted};`;
      lbl.textContent = s.label;
      box.appendChild(icon); box.appendChild(val); box.appendChild(lbl);
      statsRow.appendChild(box);
    });
    card.appendChild(statsRow);
  }

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText = `margin-top: 36px; text-align: center; font-size: 12px; color: ${C.muted}; font-family: system-ui, sans-serif; letter-spacing: 0.05em;`;
  footer.textContent = "BookVibe · Читательский дневник";
  card.appendChild(footer);

  return card;
}

async function captureCard(entry: DiaryEntry, book: Book | null): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");

  const card = await buildCardElement(entry, book);
  card.style.position = "fixed";
  card.style.top = "-9999px";
  card.style.left = "-9999px";
  document.body.appendChild(card);

  try {
    const canvas = await html2canvas(card, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: C.paper,
      logging: false,
    });
    return canvas;
  } finally {
    document.body.removeChild(card);
  }
}

export function DiaryDetailModal({ entry, book, onClose }: DiaryDetailModalProps) {
  const musicEntries = entry.music ? Object.entries(entry.music) : [];
  const images = entry.images || [];
  const stickers = entry.stickers || [];
  const ratings = entry.ratings ? Object.entries(entry.ratings) : [];
  const hasRatings = ratings.length > 0;
  const hasContent = entry.quote || entry.note || stickers.length > 0 || images.length > 0 || musicEntries.length > 0 || hasRatings;

  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSavePDF = async () => {
    setPdfLoading(true);
    try {
      const canvas = await captureCard(entry, book);
      const { jsPDF } = await import("jspdf");

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgW = pageW;
      const imgH = imgW * ratio;

      let y = 0;
      if (imgH <= pageH) {
        pdf.addImage(imgData, "JPEG", 0, 0, imgW, imgH);
      } else {
        // Multi-page: slice canvas into A4-height chunks
        const pageCanvas = document.createElement("canvas");
        const chunkH = Math.floor((canvas.width * pageH) / pageW);
        pageCanvas.width = canvas.width;
        pageCanvas.height = chunkH;
        const ctx = pageCanvas.getContext("2d")!;
        let srcY = 0;
        let first = true;
        while (srcY < canvas.height) {
          ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, chunkH, 0, 0, canvas.width, chunkH);
          const chunk = pageCanvas.toDataURL("image/jpeg", 0.92);
          if (!first) pdf.addPage();
          pdf.addImage(chunk, "JPEG", 0, 0, pageW, pageH);
          srcY += chunkH;
          first = false;
        }
      }

      const title = (book?.title || "diary").replace(/[^a-zA-Zа-яА-Я0-9]/g, "_");
      pdf.save(`bookvibe_${title}.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const canvas = await captureCard(entry, book);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("canvas.toBlob failed")), "image/png")
      );
      const title = book?.title || "Запись из дневника";
      const file = new File([blob], `bookvibe_${title}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, files: [file] });
      } else {
        const shareText = `${title}${book?.author ? ` — ${book.author}` : ""}${book?.rating ? ` (${Math.round(book.rating)}/5 ★)` : ""} #BookVibe`;
        try {
          await navigator.clipboard.writeText(shareText);
          toast({ title: "Скопировано!", description: "Текст записи скопирован в буфер обмена" });
        } catch {
          toast({ title: "Ошибка", description: "Не удалось скопировать текст", variant: "destructive" });
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error("Share error:", err);
    } finally {
      setShareLoading(false);
    }
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
        ref={containerRef}
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
        <div style={{ padding: "18px 18px 0", display: "flex", flexDirection: "column", gap: 18 }}>

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

        {/* Action buttons */}
        <div style={{
          padding: "24px 18px 36px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 8,
        }}>
          <button
            onClick={handleShare}
            disabled={shareLoading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "16px 12px",
              borderRadius: 18,
              border: "1.5px solid var(--accent)",
              background: "transparent",
              color: "var(--accent)",
              fontWeight: 800,
              fontSize: 15,
              cursor: shareLoading ? "wait" : "pointer",
              opacity: shareLoading ? 0.7 : 1,
              transition: "all 0.15s",
            }}
          >
            <Share2 size={18} />
            {shareLoading ? "Готовим..." : "Поделиться"}
          </button>

          <button
            onClick={handleSavePDF}
            disabled={pdfLoading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "16px 12px",
              borderRadius: 18,
              border: 0,
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              cursor: pdfLoading ? "wait" : "pointer",
              opacity: pdfLoading ? 0.7 : 1,
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              transition: "all 0.15s",
            }}
          >
            <Download size={18} />
            {pdfLoading ? "Создаём..." : "Сохранить PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
