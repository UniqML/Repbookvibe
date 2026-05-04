import { useState, useEffect, useRef } from "react";
import { Search, Music, Image, BookOpen, Check, Timer, Pause, Play, Flag, X, Heart, Plus } from "lucide-react";
import {
  useListBooks,
  useSaveBook,
  useSearchBooks,
  useSearchMusic,
  useSearchImages,
  useSaveDiaryEntry,
  getListBooksQueryKey,
  getListDiaryEntriesQueryKey,
  getSearchBooksQueryKey,
  getSearchMusicQueryKey,
  getSearchImagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Book, BookSearchItem } from "@workspace/api-client-react";
import { useBookState } from "@/hooks/useBookState";
import { addReadingSession } from "@/hooks/useReadingSessions";

const STICKERS = ["slow burn", "plot twist", "book boyfriend", "уютное чтение", "стекло", "магия", "детектив", "романтика", "академия", "атмосфера", "финал", "цитатно"];
const RATING_KEYS = ["Сюжет", "Персонажи", "Атмосфера", "Романтика", "Стекло", "Динамика"];

function formatTimer(s: number) {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function PagePicker({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const ITEM_H = 40;
  const VISIBLE = 5;
  const pagesArr = Array.from({ length: Math.max(max, 1) }, (_, i) => i + 1);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = (value - 1) * ITEM_H;
  }, []);

  const handleScroll = () => {
    if (!listRef.current) return;
    const idx = Math.round(listRef.current.scrollTop / ITEM_H);
    onChange(Math.min(max, Math.max(1, idx + 1)));
  };

  return (
    <div style={{ position: "relative", height: ITEM_H * VISIBLE, overflow: "hidden", borderRadius: 16, background: "rgba(0,0,0,0.04)" }}>
      <div style={{
        position: "absolute", top: "50%", left: 0, right: 0, height: ITEM_H,
        background: "color-mix(in srgb, var(--accent), white 82%)", borderRadius: 12,
        transform: "translateY(-50%)", zIndex: 0,
        border: "1.5px solid color-mix(in srgb, var(--accent), white 60%)",
      }} />
      <div ref={listRef} onScroll={handleScroll} style={{
        height: "100%", overflowY: "scroll", scrollSnapType: "y mandatory",
        scrollbarWidth: "none", position: "relative", zIndex: 1,
        paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2,
      }}>
        {pagesArr.map(p => {
          const sel = p === value;
          return (
            <div key={p} onClick={() => { onChange(p); if (listRef.current) listRef.current.scrollTop = (p - 1) * ITEM_H; }}
              style={{ height: ITEM_H, display: "flex", alignItems: "center", justifyContent: "center", scrollSnapAlign: "center", cursor: "pointer" }}>
              <span style={{ fontSize: sel ? 20 : 14, fontWeight: sel ? 800 : 400, color: sel ? "var(--accent)" : "var(--muted)", transition: "font-size 0.15s, color 0.15s" }}>
                с. {p}
                {sel && max > 0 && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 6, color: "var(--muted)" }}>({Math.round(p / max * 100)}%)</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DiaryModal({
  book, timerSeconds, readPagesVal,
  onClose, onSaved,
}: {
  book: Book; timerSeconds: number; readPagesVal: number;
  onClose: () => void; onSaved: () => void;
}) {
  const qc = useQueryClient();
  const { mutateAsync: saveBook } = useSaveBook();
  const { mutateAsync: saveDiary } = useSaveDiaryEntry();

  const [quote, setQuote] = useState("");
  const [note, setNote] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<Array<{ title: string; artist: string }>>([]);
  const [starRating, setStarRating] = useState(0);
  const [bookFormat, setBookFormat] = useState<"paper" | "digital" | "audio">("paper");
  const [binding, setBinding] = useState<"hard" | "soft">("soft");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [musicQ, setMusicQ] = useState("");
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [imageQ, setImageQ] = useState("");
  const [imageEnabled, setImageEnabled] = useState(false);

  const { data: musicData, isLoading: musicSearching } = useSearchMusic(
    { q: musicQ || " ", limit: 8 },
    { query: { enabled: musicEnabled && musicQ.trim().length > 0, queryKey: getSearchMusicQueryKey({ q: musicQ, limit: 8 }) } }
  );
  const musicResults = musicData?.items || [];

  const { data: imageData, isLoading: imageSearching } = useSearchImages(
    { q: imageQ || " ", limit: 9 },
    { query: { enabled: imageEnabled && imageQ.trim().length > 0, queryKey: getSearchImagesQueryKey({ q: imageQ, limit: 9 }) } }
  );
  const imageResults = imageData?.items || [];

  const toggleSticker = (s: string) =>
    setSelectedStickers(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const formatTags: string[] = [];
      if (bookFormat === "paper") formatTags.push("бумажная", binding === "hard" ? "жёсткий переплёт" : "мягкий переплёт");
      if (bookFormat === "digital") formatTags.push("электронная");
      if (bookFormat === "audio") formatTags.push("аудиокнига");
      const allVibes = [...new Set([...selectedStickers, ...formatTags])];

      await saveBook({
        data: {
          id: book.id, title: book.title, author: book.author || "",
          cover: book.cover || "", pages: book.pages || 0, read_pages: book.pages || 0,
          isbn: book.isbn || "", status: "Прочитано",
          shelf: book.shelf || "Новые", vibe: allVibes, rating: starRating,
        }
      });

      const musicMap: Record<string, string> = {};
      selectedMusic.forEach(m => { musicMap[m.title] = m.artist; });

      await saveDiary({
        data: {
          book_id: book.id, quote, note, ratings,
          music: musicMap,
          images: selectedImages,
          stickers: selectedStickers,
        }
      });

      try { localStorage.setItem(`bookvibe_book_meta_${book.id}`, JSON.stringify({ format: bookFormat, binding })); } catch {}
      qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
      qc.invalidateQueries({ queryKey: getListDiaryEntriesQueryKey() });
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 480, maxHeight: "92dvh", overflowY: "auto",
        background: "var(--paper)", borderRadius: "28px 28px 0 0",
        padding: "0 0 32px", boxShadow: "0 -8px 40px rgba(44,33,27,0.18)",
        scrollbarWidth: "none",
      }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 2, background: "var(--paper)",
          padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--line)",
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>Дневник читателя</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{book.title}</div>
          </div>
          <button onClick={onClose} style={{ border: 0, background: "rgba(0,0,0,0.07)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink)" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 20 }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Формат чтения</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["paper", "digital", "audio"] as const).map(f => (
                <button key={f} onClick={() => setBookFormat(f)}
                  style={{ flex: 1, border: bookFormat === f ? "2px solid var(--accent)" : "1px solid var(--line)", borderRadius: 14, padding: "8px 4px", background: bookFormat === f ? "color-mix(in srgb, var(--accent), white 85%)" : "transparent", color: bookFormat === f ? "var(--accent)" : "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  {f === "paper" ? "📖 Бумага" : f === "digital" ? "📱 Электронная" : "🎧 Аудио"}
                </button>
              ))}
            </div>
            {bookFormat === "paper" && (
              <div style={{ display: "flex", gap: 8 }}>
                {(["soft", "hard"] as const).map(b => (
                  <button key={b} onClick={() => setBinding(b)}
                    style={{ flex: 1, border: binding === b ? "2px solid var(--accent)" : "1px solid var(--line)", borderRadius: 14, padding: "8px 4px", background: binding === b ? "color-mix(in srgb, var(--accent), white 85%)" : "transparent", color: binding === b ? "var(--accent)" : "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    {b === "soft" ? "Мягкий переплёт" : "Твёрдый переплёт"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Оценка</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setStarRating(s)}
                  style={{ flex: 1, fontSize: 22, border: 0, background: "transparent", cursor: "pointer", opacity: s <= starRating ? 1 : 0.25, transition: "opacity 0.15s" }}>⭐</button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Цитата</div>
            <textarea value={quote} onChange={e => setQuote(e.target.value)}
              placeholder="«Самая любимая цитата из книги...»"
              style={{ width: "100%", minHeight: 80, borderRadius: 16, border: "1px solid var(--line)", padding: "12px 14px", resize: "none", fontFamily: "inherit", fontSize: 14, color: "var(--ink)", background: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Заметки и впечатления</div>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Что понравилось? Что запомнилось больше всего?"
              style={{ width: "100%", minHeight: 100, borderRadius: 16, border: "1px solid var(--line)", padding: "12px 14px", resize: "none", fontFamily: "inherit", fontSize: 14, color: "var(--ink)", background: "rgba(255,255,255,0.7)", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Оценка по составляющим</div>
            {RATING_KEYS.map(key => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 13, color: "var(--ink)", width: 90, flexShrink: 0 }}>{key}</div>
                <input type="range" min={0} max={10} value={ratings[key] ?? 0}
                  onChange={e => setRatings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                  style={{ flex: 1, accentColor: "var(--accent)" }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", width: 24, textAlign: "right" }}>{ratings[key] ?? 0}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Настроение книги</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STICKERS.map(s => (
                <button key={s} onClick={() => toggleSticker(s)}
                  style={{ border: 0, borderRadius: 999, padding: "7px 13px", background: selectedStickers.includes(s) ? "var(--accent)" : "rgba(0,0,0,0.06)", color: selectedStickers.includes(s) ? "white" : "var(--ink)", cursor: "pointer", fontSize: 12, fontWeight: selectedStickers.includes(s) ? 700 : 400, transition: "all 0.15s" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Музыка книги</div>
            {selectedMusic.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
                {selectedMusic.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "color-mix(in srgb, var(--accent), white 88%)", borderRadius: 12, padding: "8px 12px" }}>
                    <Music size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.artist}</div>
                    </div>
                    <button onClick={() => setSelectedMusic(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ border: 0, background: "transparent", cursor: "pointer", padding: 2, color: "var(--muted)" }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!musicEnabled ? (
              <button onClick={() => setMusicEnabled(true)}
                style={{ border: "1px dashed var(--line)", borderRadius: 14, padding: "10px 14px", background: "transparent", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <Plus size={14} /> Добавить музыку
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line)", background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: "10px 12px" }}>
                    <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    <input value={musicQ} onChange={e => setMusicQ(e.target.value)}
                      placeholder="Название трека или исполнитель..."
                      style={{ flex: 1, border: 0, outline: 0, background: "transparent", color: "var(--ink)", fontSize: 14, fontFamily: "inherit" }} />
                  </div>
                  <button onClick={() => { setMusicEnabled(false); setMusicQ(""); }}
                    style={{ border: 0, background: "rgba(0,0,0,0.07)", borderRadius: 14, padding: "0 12px", cursor: "pointer", color: "var(--muted)" }}>
                    <X size={14} />
                  </button>
                </div>
                {musicSearching && <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Поиск...</p>}
                {!musicSearching && musicQ.trim().length > 0 && musicResults.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Ничего не найдено</p>}
                {musicResults.map(item => (
                  <button key={item.title + (item.artist || "")}
                    onClick={() => {
                      setSelectedMusic(prev => [...prev, { title: item.title, artist: item.artist || "" }]);
                      setMusicEnabled(false);
                      setMusicQ("");
                    }}
                    style={{ border: "1px solid var(--line)", background: "white", borderRadius: 14, padding: "10px 14px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.artist || ""}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Картинки и атмосфера</div>
            {selectedImages.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 4 }}>
                {selectedImages.map((url, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={url} alt="" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 12 }} />
                    <button onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ position: "absolute", top: 4, right: 4, border: 0, background: "rgba(0,0,0,0.5)", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!imageEnabled ? (
              <button onClick={() => setImageEnabled(true)}
                style={{ border: "1px dashed var(--line)", borderRadius: 14, padding: "10px 14px", background: "transparent", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <Plus size={14} /> Добавить картинки
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line)", background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: "10px 12px" }}>
                    <Image size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    <input value={imageQ} onChange={e => setImageQ(e.target.value)}
                      placeholder="Настроение, пейзаж, цвет..."
                      style={{ flex: 1, border: 0, outline: 0, background: "transparent", color: "var(--ink)", fontSize: 14, fontFamily: "inherit" }} />
                  </div>
                  <button onClick={() => { setImageEnabled(false); setImageQ(""); }}
                    style={{ border: 0, background: "rgba(0,0,0,0.07)", borderRadius: 14, padding: "0 12px", cursor: "pointer", color: "var(--muted)" }}>
                    <X size={14} />
                  </button>
                </div>
                {imageSearching && <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Поиск...</p>}
                {!imageSearching && imageQ.trim().length > 0 && imageResults.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Ничего не найдено</p>}
                {imageResults.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {imageResults.map((item, idx) => (
                      <button key={item.url || idx}
                        onClick={() => {
                          setSelectedImages(prev => prev.includes(item.url) ? prev : [...prev, item.url]);
                          setImageEnabled(false);
                          setImageQ("");
                        }}
                        style={{ border: "2px solid transparent", padding: 0, borderRadius: 12, overflow: "hidden", cursor: "pointer" }}>
                        <img src={item.url} alt={item.title || "image"} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {saved ? (
            <div style={{ background: "var(--accent)", color: "white", borderRadius: 18, padding: "14px 16px", textAlign: "center", fontWeight: 800, fontSize: 15 }}>
              ✓ Запись сохранена в дневнике!
            </div>
          ) : (
            <button onClick={handleSave} disabled={saving}
              style={{ border: 0, borderRadius: 18, padding: "14px 16px", background: "var(--accent)", color: "white", fontWeight: 800, fontSize: 15, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Сохраняем..." : "Сохранить запись в дневник"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookTab() {
  const qc = useQueryClient();
  const { activeBookId, setActiveBook } = useBookState();

  const [searchQ, setSearchQ] = useState("");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [bookShelfUpdateBusy, setBookShelfUpdateBusy] = useState<number | null>(null);

  const TIMER_RUNNING_KEY = "bookvibe_reading_timer_running";
  const TIMER_SECONDS_KEY = "bookvibe_reading_timer_seconds";
  const TIMER_UPDATED_AT_KEY = "bookvibe_reading_timer_updated_at";
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showSession, setShowSession] = useState(false);
  const [pickerPage, setPickerPage] = useState<number | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);

  const { data: booksData, isLoading } = useListBooks();
  const books: Book[] = booksData?.items || [];
  const activeBook = books.find(b => b.id === activeBookId) || books.find(b => b.status === "Читаю") || books[0] || null;

  const pages = activeBook?.pages || 0;
  const readPagesVal = activeBook?.read_pages || 0;
  const progressPct = pages > 0 ? Math.min(100, Math.round(readPagesVal / pages * 100)) : 0;

  useEffect(() => {
    try {
      const savedRunning = localStorage.getItem(TIMER_RUNNING_KEY) === "true";
      const savedSeconds = Number(localStorage.getItem(TIMER_SECONDS_KEY) || "0");
      const savedUpdatedAt = Number(localStorage.getItem(TIMER_UPDATED_AT_KEY) || "0");
      const extra = savedRunning && savedUpdatedAt > 0 ? Math.max(0, Math.floor((Date.now() - savedUpdatedAt) / 1000)) : 0;
      setTimerRunning(savedRunning);
      setTimerSeconds(savedSeconds + extra);
    } catch {}
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    try {
      localStorage.setItem(TIMER_RUNNING_KEY, timerRunning ? "true" : "false");
      localStorage.setItem(TIMER_SECONDS_KEY, String(timerSeconds));
      localStorage.setItem(TIMER_UPDATED_AT_KEY, String(Date.now()));
    } catch {}
  }, [timerRunning, timerSeconds]);

  useEffect(() => {
    if (activeBook && pickerPage === null) {
      setPickerPage(activeBook.read_pages || 1);
    }
  }, [activeBook?.id]);

  const { data: searchData, isLoading: searching } = useSearchBooks(
    { q: searchQ || " ", limit: 10 },
    { query: { enabled: searchEnabled && searchQ.trim().length > 0, queryKey: getSearchBooksQueryKey({ q: searchQ, limit: 10 }) } }
  );
  const searchResults = searchData?.items || [];

  const { mutateAsync: saveBook } = useSaveBook();

  const toggleFavorite = async (book: Book) => {
    if (!book?.id) return;
    setBookShelfUpdateBusy(book.id);
    try {
      const nextShelf = book.shelf === "Любимые" ? "Новые" : "Любимые";
      await saveBook({ data: { id: book.id, title: book.title, author: book.author || "", cover: book.cover || "", pages: book.pages || 0, read_pages: book.read_pages || 0, isbn: book.isbn || "", status: book.status, shelf: nextShelf, vibe: book.vibe || [], rating: book.rating || 0 } });
      qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
    } finally {
      setBookShelfUpdateBusy(null);
    }
  };

  const openReadingForBook = (book: Book) => {
    setActiveBook(book.id);
    setPickerPage(book.read_pages || 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddBook = async (item: BookSearchItem) => {
    const result = await saveBook({ data: { title: item.title, author: item.author || "", cover: item.cover || "", pages: item.pages || 0, isbn: item.isbn || "", external_id: item.external_id, source: item.source, description: item.description || "", status: "Читаю", shelf: "Новые", vibe: [] } });
    qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
    if (result?.item?.id) {
      setActiveBook(result.item.id);
      setPickerPage(1);
      setSearchQ("");
      setSearchEnabled(false);
    }
  };

  const handleSaveSession = async () => {
    if (!activeBook || pickerPage === null) return;
    const newPage = pickerPage;
    const finished = pages > 0 && newPage >= pages;
    await saveBook({
      data: {
        id: activeBook.id, title: activeBook.title, author: activeBook.author || "",
        cover: activeBook.cover || "", pages, read_pages: newPage,
        isbn: activeBook.isbn || "", status: finished ? "Прочитано" : "Читаю",
        shelf: activeBook.shelf || "Новые", vibe: activeBook.vibe || [], rating: activeBook.rating || 0,
      }
    });
    addReadingSession({
      date: new Date().toDateString(), bookId: activeBook.id, bookTitle: activeBook.title,
      bookCover: activeBook.cover || "", pagesRead: newPage - readPagesVal,
      durationSeconds: timerSeconds, timestamp: Date.now(),
    });
    qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
    setShowSession(false);
    setSessionSaved(true);
    if (finished) setShowDiaryModal(true);
    setTimeout(() => setSessionSaved(false), 3000);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
    try { localStorage.removeItem(TIMER_RUNNING_KEY); localStorage.removeItem(TIMER_SECONDS_KEY); localStorage.removeItem(TIMER_UPDATED_AT_KEY); } catch {}
  };

  const now = new Date();
  const dateLabel = `${now.toLocaleDateString("ru-RU")} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const shelfBooks = (name: string) => books.filter(b => b.shelf === name);

  return (
    <>
      <div style={{ padding: "14px 18px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        {isLoading && <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", margin: 0 }}>Загрузка...</p>}

        {!isLoading && activeBook ? (
          <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 28, padding: 14, display: "grid", gridTemplateColumns: "108px 1fr", gap: 14, boxShadow: "0 8px 32px rgba(44,33,27,0.1)" }}>
            <img src={activeBook.cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=300&q=60"}
              alt={activeBook.title}
              style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 14 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--accent)", background: "color-mix(in srgb, var(--accent-2), white 30%)", padding: "3px 8px", borderRadius: 999, fontWeight: 600, alignSelf: "flex-start" }}>
                {activeBook.status}
              </span>
              <h2 style={{ color: "var(--ink)", margin: 0, lineHeight: 1.15, fontWeight: 800, fontSize: 15 }}>{activeBook.title}</h2>
              <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>{activeBook.author}</p>
              {pages > 0 && (
                <div style={{ marginTop: "auto" }}>
                  <div style={{ height: 7, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: 3 }}>
                    <div style={{ height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg, var(--accent), var(--accent-2))", width: `${progressPct}%`, transition: "width 0.4s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{readPagesVal} / {pages} стр. · {progressPct}%</span>
                </div>
              )}
            </div>
          </div>
        ) : !isLoading && (
          <div style={{ textAlign: "center", padding: "28px 0", color: "var(--muted)" }}>
            <BookOpen size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: "var(--ink)", margin: "0 0 4px" }}>Нет активной книги</p>
            <p style={{ fontSize: 13, margin: 0 }}>Найдите книгу в каталоге ниже</p>
          </div>
        )}

        {sessionSaved && (
          <div style={{ background: "var(--accent)", color: "white", borderRadius: 18, padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
            ✓ Сеанс сохранён в трекере!
          </div>
        )}

        {activeBook && (
          <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 24, padding: 16, boxShadow: "0 4px 16px rgba(44,33,27,0.06)" }}>
            <h4 style={{ color: "var(--ink)", margin: "0 0 14px", fontWeight: 700, fontSize: 14 }}>Сеанс чтения</h4>

            {!showSession ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{
                  background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent), #1a1008 45%))",
                  borderRadius: 20, padding: "18px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <Timer size={12} />
                      Время чтения
                    </div>
                    <div style={{ color: "white", fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }}>
                      {formatTimer(timerSeconds)}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={() => setTimerRunning(r => !r)}
                      style={{ border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 14, padding: "9px 16px", background: "rgba(255,255,255,0.15)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      {timerRunning ? <Pause size={14} /> : <Play size={14} />}
                      {timerRunning ? "Пауза" : timerSeconds > 0 ? "Продолжить" : "Старт"}
                    </button>
                    {timerSeconds > 0 && (
                      <button onClick={resetTimer}
                        style={{ border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 14, padding: "7px 16px", background: "rgba(0,0,0,0.15)", color: "rgba(255,255,255,0.8)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <Flag size={12} />
                        Сбросить
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => setShowSession(true)}
                    style={{ border: 0, borderRadius: 14, padding: "12px", background: "var(--accent)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Check size={14} />
                    Отметить страницу
                  </button>
                  <button onClick={() => setShowDiaryModal(true)}
                    style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "12px", background: "transparent", color: "var(--accent)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Check size={14} />
                    Я всё прочитал!
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{dateLabel}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "color-mix(in srgb, var(--accent-2), white 40%)", borderRadius: 14, padding: "10px 14px" }}>
                  <Timer size={16} style={{ color: "var(--accent)" }} />
                  <span style={{ color: "var(--ink)", fontWeight: 700, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{formatTimer(timerSeconds)}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13, marginBottom: 8 }}>Сколько вы прочитали?</div>
                  <PagePicker value={pickerPage ?? readPagesVal} max={pages || 999} onChange={setPickerPage} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleSaveSession}
                    style={{ flex: 1, border: 0, borderRadius: 14, padding: "13px", background: "var(--accent)", color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                    ✓ Сохранить
                  </button>
                  <button onClick={() => setShowSession(false)}
                    style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 14, padding: "13px", background: "transparent", color: "var(--muted)", fontSize: 13, cursor: "pointer" }}>
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(shelfBooks("Хочу прочитать").length > 0 || shelfBooks("Любимые").length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {["Хочу прочитать", "Любимые"].map(shelfName => {
              const list = shelfBooks(shelfName);
              if (!list.length) return null;
              return (
                <div key={shelfName}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{shelfName}</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    {list.map(book => {
                      const fav = book.shelf === "Любимые";
                      return (
                        <div key={book.id} style={{ position: "relative" }}>
                          <button
                            onClick={() => toggleFavorite(book)}
                            disabled={bookShelfUpdateBusy === book.id}
                            aria-label={fav ? "Убрать из избранного" : "В избранное"}
                            style={{ position: "absolute", top: 8, right: 8, zIndex: 2, width: 30, height: 30, borderRadius: "50%", border: 0, background: "rgba(255,255,255,0.92)", color: fav ? "#ef4444" : "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                            <Heart size={14} fill={fav ? "#ef4444" : "none"} strokeWidth={2} />
                          </button>
                          <button onClick={() => openReadingForBook(book)}
                            style={{ width: "100%", padding: 0, border: 0, background: "transparent", textAlign: "left", cursor: "pointer" }}>
                            <img src={book.cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=300&q=60"}
                              alt={book.title}
                              style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 16, boxShadow: "0 6px 20px rgba(44,33,27,0.12)", display: "block" }} />
                            <div style={{ padding: "8px 2px 0" }}>
                              <div style={{ color: "var(--ink)", fontSize: 13, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{book.title}</div>
                              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.author}</div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 24, padding: 16, boxShadow: "0 4px 16px rgba(44,33,27,0.06)" }}>
          <h4 style={{ color: "var(--ink)", margin: "0 0 12px", fontWeight: 700, fontSize: 14 }}>Найти книгу</h4>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line)", background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: "10px 12px" }}>
              <Search size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input value={searchQ}
                onChange={e => { setSearchQ(e.target.value); if (e.target.value.trim()) setSearchEnabled(true); }}
                onKeyDown={e => e.key === "Enter" && setSearchEnabled(true)}
                placeholder="Название или автор..."
                style={{ flex: 1, border: 0, outline: 0, background: "transparent", color: "var(--ink)", fontSize: 14, fontFamily: "inherit" }} />
            </div>
            <button onClick={() => setSearchEnabled(true)}
              style={{ border: 0, borderRadius: 14, padding: "10px 14px", background: "var(--accent)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              <Search size={14} />
              Искать
            </button>
          </div>

          {searchEnabled && searchQ.trim().length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {searching && <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Поиск...</p>}
              {!searching && searchResults.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Ничего не найдено</p>}
              {searchResults.map(item => (
                <button key={`${item.source}-${item.external_id || item.title}`}
                  onClick={() => handleAddBook(item)}
                  style={{ border: "1px solid var(--line)", background: "white", borderRadius: 16, padding: 12, display: "grid", gridTemplateColumns: "52px 1fr", gap: 10, textAlign: "left", cursor: "pointer" }}>
                  <img src={item.cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=200&q=60"}
                    alt={item.title}
                    style={{ width: 52, height: 78, objectFit: "cover", borderRadius: 10 }} />
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14, lineHeight: 1.2 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.author || ""}</div>
                    {item.pages && <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.pages} стр.</div>}
                    <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginTop: 2 }}>Добавить в «Читаю» →</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDiaryModal && activeBook && (
        <DiaryModal
          book={activeBook}
          timerSeconds={timerSeconds}
          readPagesVal={readPagesVal}
          onClose={() => setShowDiaryModal(false)}
          onSaved={() => {
            setSessionSaved(true);
            setTimeout(() => setSessionSaved(false), 3000);
          }}
        />
      )}
    </>
  );
}
