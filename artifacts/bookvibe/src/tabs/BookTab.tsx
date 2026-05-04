import { useState, useEffect, useRef } from "react";
import { Search, Music, Image, Sparkles, BookOpen, Plus, Check, Timer, Pause, Play, Square, Flag } from "lucide-react";
import {
  useListBooks,
  useSaveBook,
  useDeleteBook,
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
  const pages = Array.from({ length: Math.max(max, 1) }, (_, i) => i + 1);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = (value - 1) * ITEM_H;
    }
  }, []);

  const handleScroll = () => {
    if (!listRef.current) return;
    const idx = Math.round(listRef.current.scrollTop / ITEM_H);
    const page = Math.min(max, Math.max(1, idx + 1));
    onChange(page);
  };

  return (
    <div style={{ position: "relative", height: ITEM_H * VISIBLE, overflow: "hidden", borderRadius: 16, background: "rgba(0,0,0,0.04)" }}>
      <div
        style={{
          position: "absolute", top: "50%", left: 0, right: 0,
          height: ITEM_H, background: "color-mix(in srgb, var(--accent), white 82%)",
          borderRadius: 12, transform: "translateY(-50%)", zIndex: 0,
          border: "1.5px solid color-mix(in srgb, var(--accent), white 60%)",
        }}
      />
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          height: "100%", overflowY: "scroll", scrollSnapType: "y mandatory",
          scrollbarWidth: "none", position: "relative", zIndex: 1,
          paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2,
        }}
      >
        <style>{`.page-picker-scroll::-webkit-scrollbar { display: none; }`}</style>
        {pages.map(p => {
          const isSelected = p === value;
          return (
            <div
              key={p}
              onClick={() => {
                onChange(p);
                if (listRef.current) listRef.current.scrollTop = (p - 1) * ITEM_H;
              }}
              style={{
                height: ITEM_H, display: "flex", alignItems: "center", justifyContent: "center",
                scrollSnapAlign: "center", cursor: "pointer",
              }}
            >
              <span style={{
                fontSize: isSelected ? 20 : 14,
                fontWeight: isSelected ? 800 : 400,
                color: isSelected ? "var(--accent)" : "var(--muted)",
                transition: "font-size 0.15s, color 0.15s",
              }}>
                с. {p}
                {isSelected && max > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 6, color: "var(--muted)" }}>
                    ({Math.round(p / max * 100)}%)
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BookTab() {
  const qc = useQueryClient();
  const { activeBookId, setActiveBook } = useBookState();

  const [searchQ, setSearchQ] = useState("");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [musicQ, setMusicQ] = useState("");
  const [musicSearchEnabled, setMusicSearchEnabled] = useState(false);
  const [imageQ, setImageQ] = useState("");
  const [imageSearchEnabled, setImageSearchEnabled] = useState(false);

  const [quote, setQuote] = useState("");
  const [note, setNote] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<Record<string, string>>({});
  const [showFinish, setShowFinish] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [bookFormat, setBookFormat] = useState<"paper" | "digital" | "audio">("paper");
  const [binding, setBinding] = useState<"hard" | "soft">("soft");
  const [showDiary, setShowDiary] = useState(false);
  const [savingDiary, setSavingDiary] = useState(false);
  const [savedDiary, setSavedDiary] = useState(false);

  // Timer state
  const TIMER_RUNNING_KEY = "bookvibe_reading_timer_running";
  const TIMER_SECONDS_KEY = "bookvibe_reading_timer_seconds";
  const TIMER_UPDATED_AT_KEY = "bookvibe_reading_timer_updated_at";
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showSession, setShowSession] = useState(false);
  const [pickerPage, setPickerPage] = useState<number | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);

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
      const extraSeconds = savedRunning && savedUpdatedAt > 0 ? Math.max(0, Math.floor((Date.now() - savedUpdatedAt) / 1000)) : 0;
      setTimerRunning(savedRunning);
      setTimerSeconds(savedSeconds + extraSeconds);
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

  const { data: musicData, isLoading: musicSearching } = useSearchMusic(
    { q: musicQ || " ", limit: 8 },
    { query: { enabled: musicSearchEnabled && musicQ.trim().length > 0, queryKey: getSearchMusicQueryKey({ q: musicQ, limit: 8 }) } }
  );
  const musicResults = musicData?.items || [];

  const { data: imageData, isLoading: imageSearching } = useSearchImages(
    { q: imageQ || " ", limit: 9 },
    { query: { enabled: imageSearchEnabled && imageQ.trim().length > 0, queryKey: getSearchImagesQueryKey({ q: imageQ, limit: 9 }) } }
  );
  const imageResults = imageData?.items || [];

  const { mutateAsync: saveBook } = useSaveBook();
  useDeleteBook();
  const { mutateAsync: saveDiary } = useSaveDiaryEntry();

  const handleAddBook = async (item: BookSearchItem, status: string) => {
    const result = await saveBook({ data: { title: item.title, author: item.author || "", cover: item.cover || "", pages: item.pages || 0, isbn: item.isbn || "", external_id: item.external_id, source: item.source, description: item.description || "", status, shelf: "Новые", vibe: [] } });
    qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
    if (status === "Читаю" && result?.item?.id) {
      setActiveBook(result.item.id);
      setPickerPage(1);
    }
  };

  const handleSaveSession = async () => {
    if (!activeBook || pickerPage === null) return;
    const newPage = pickerPage;
    const finished = pages > 0 && newPage >= pages;
    await saveBook({
      data: {
        id: activeBook.id,
        title: activeBook.title, author: activeBook.author || "",
        cover: activeBook.cover || "", pages, read_pages: newPage,
        isbn: activeBook.isbn || "", status: finished ? "Прочитано" : "Читаю",
        shelf: activeBook.shelf || "Новые", vibe: activeBook.vibe || [],
        rating: activeBook.rating || 0,
      }
    });

    addReadingSession({
      date: new Date().toDateString(),
      bookId: activeBook.id,
      bookTitle: activeBook.title,
      bookCover: activeBook.cover || "",
      pagesRead: newPage - readPagesVal,
      durationSeconds: timerSeconds,
      timestamp: Date.now(),
    });

    qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
    setShowSession(false);
    setSessionSaved(true);
    if (finished) setShowFinish(true);
    setTimeout(() => setSessionSaved(false), 3000);
  };

  const handleFinishBook = async () => {
    if (!activeBook) return;
    const formatTags: string[] = [];
    if (bookFormat === "paper") formatTags.push("бумажная", binding === "hard" ? "жёсткий переплёт" : "мягкий переплёт");
    if (bookFormat === "digital") formatTags.push("электронная");
    if (bookFormat === "audio") formatTags.push("аудиокнига");
    const allVibes = [...new Set([...selectedStickers, ...formatTags])];
    await saveBook({ data: { id: activeBook.id, title: activeBook.title, author: activeBook.author || "", cover: activeBook.cover || "", pages: activeBook.pages || 0, read_pages: activeBook.pages || 0, isbn: activeBook.isbn || "", status: "Прочитано", shelf: activeBook.shelf || "Новые", vibe: allVibes, rating: starRating } });
    try {
      localStorage.setItem(`bookvibe_book_meta_${activeBook.id}`, JSON.stringify({ format: bookFormat, binding }));
    } catch {}
    qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
    setShowFinish(false);
  };

  const handleSaveDiary = async () => {
    if (!activeBook) return;
    setSavingDiary(true);
    try {
      await saveDiary({ data: { book_id: activeBook.id, quote, note, ratings, music: selectedMusic, images: selectedImages, stickers: selectedStickers } });
      qc.invalidateQueries({ queryKey: getListDiaryEntriesQueryKey() });
      setSavedDiary(true);
      setTimeout(() => setSavedDiary(false), 3000);
    } finally {
      setSavingDiary(false);
    }
  };

  const toggleSticker = (s: string) => {
    setSelectedStickers(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const panel = (children: React.ReactNode, title?: string) => (
    <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 24, padding: 16, boxShadow: "0 4px 16px rgba(44,33,27,0.06)" }}>
      {title && <h4 style={{ color: "var(--ink)", margin: "0 0 12px", fontWeight: 700, fontSize: 14 }}>{title}</h4>}
      {children}
    </div>
  );

  const now = new Date();
  const dateLabel = `${now.toLocaleDateString("ru-RU")} ${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;

  return (
    <div style={{ padding: "14px 18px 28px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Active Book */}
      {isLoading && <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center" }}>Загрузка...</p>}
      {!isLoading && activeBook ? (
        <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 28, padding: 14, display: "grid", gridTemplateColumns: "118px 1fr", gap: 16, boxShadow: "0 8px 32px rgba(44,33,27,0.1)" }}>
          <img
            src={activeBook.cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=300&q=60"}
            alt={activeBook.title}
            style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 16 }}
          />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 11, color: "var(--accent)", background: "color-mix(in srgb, var(--accent-2), white 30%)", padding: "3px 8px", borderRadius: 999, fontWeight: 600 }}>{activeBook.status}</span>
              <h2 style={{ color: "var(--ink)", margin: "8px 0 4px", lineHeight: 1.1, fontWeight: 800, fontSize: 15 }}>{activeBook.title}</h2>
              <p style={{ color: "var(--muted)", margin: "0 0 10px", fontSize: 13 }}>{activeBook.author}</p>
            </div>
            {pages > 0 && (
              <div>
                <div style={{ height: 8, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg, var(--accent), var(--accent-2))", width: `${progressPct}%` }} />
                </div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{readPagesVal} / {pages} стр. ({progressPct}%)</span>
              </div>
            )}
          </div>
        </div>
      ) : !isLoading && (
        <div style={{ textAlign: "center", padding: "30px 0", color: "var(--muted)" }}>
          <BookOpen size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontWeight: 600, color: "var(--ink)" }}>Нет активной книги</p>
          <p style={{ fontSize: 13 }}>Найдите книгу в каталоге ниже</p>
        </div>
      )}

      {/* Reading session saved notification */}
      {sessionSaved && (
        <div style={{ background: "var(--accent)", color: "white", borderRadius: 18, padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
          ✓ Сеанс чтения сохранён в трекере!
        </div>
      )}

      {/* Reading Timer + Session */}
      {activeBook && activeBook.status === "Читаю" && (
        <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 24, padding: 16, boxShadow: "0 4px 16px rgba(44,33,27,0.06)" }}>
          <h4 style={{ color: "var(--ink)", margin: "0 0 12px", fontWeight: 700, fontSize: 14 }}>Сеанс чтения</h4>

          {!showSession ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Timer display */}
              <div style={{
                background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent), #1a1008 45%))",
                borderRadius: 20, padding: "18px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <Timer size={12} />
                    Вы читали
                  </div>
                  <div style={{ color: "white", fontSize: 30, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }}>
                    {formatTimer(timerSeconds)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    onClick={() => setTimerRunning(r => !r)}
                    style={{
                      border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 14, padding: "8px 14px",
                      background: "rgba(255,255,255,0.15)", color: "white",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {timerRunning ? <Pause size={14} /> : <Play size={14} />}
                    {timerRunning ? "Пауза" : timerSeconds > 0 ? "Продолжить" : "Старт"}
                  </button>
                  {timerSeconds > 0 && (
                    <button
                      onClick={() => { setTimerRunning(false); setTimerSeconds(0); try { localStorage.removeItem(TIMER_RUNNING_KEY); localStorage.removeItem(TIMER_SECONDS_KEY); localStorage.removeItem(TIMER_UPDATED_AT_KEY); } catch {} }}
                      style={{
                        border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 14, padding: "7px 14px",
                        background: "rgba(0,0,0,0.15)", color: "rgba(255,255,255,0.8)",
                        fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <Flag size={12} />
                      Сдаться
                    </button>
                  )}
                </div>
              </div>

              {/* Two action buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  onClick={() => { setShowSession(true); }}
                  style={{
                    border: 0, borderRadius: 999, padding: "12px",
                    background: "var(--accent)", color: "white",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <Check size={14} />
                  Выбрать стр.
                </button>
                <button
                  onClick={() => { setBookFormat("paper"); setBinding("soft"); setShowFinish(true); }}
                  style={{
                    border: "1px solid var(--line)", borderRadius: 999, padding: "12px",
                    background: "transparent", color: "var(--accent)",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <Check size={14} />
                  Я всё прочитал!
                </button>
              </div>
            </div>
          ) : (
            /* Session save panel */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{dateLabel}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "color-mix(in srgb, var(--accent-2), white 40%)", borderRadius: 14, padding: "10px 14px" }}>
                  <Timer size={16} style={{ color: "var(--accent)" }} />
                  <span style={{ color: "var(--ink)", fontWeight: 700, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{formatTimer(timerSeconds)}</span>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13, marginBottom: 8 }}>Сколько вы прочитали?</div>
                <PagePicker
                  value={pickerPage ?? readPagesVal}
                  max={pages || 999}
                  onChange={setPickerPage}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleSaveSession}
                  style={{
                    flex: 1, border: 0, borderRadius: 999, padding: "13px",
                    background: "var(--accent)", color: "white",
                    fontWeight: 800, fontSize: 15, cursor: "pointer",
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={() => setShowSession(false)}
                  style={{
                    flex: 2, border: "1px solid var(--line)", borderRadius: 999, padding: "13px",
                    background: "transparent", color: "var(--muted)",
                    fontSize: 13, cursor: "pointer",
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Finish book modal */}
      {showFinish && activeBook && (
        <div style={{ border: "2px solid var(--accent)", background: "var(--paper)", borderRadius: 28, padding: 20, boxShadow: "0 20px 60px rgba(44,33,27,0.18)", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h3 style={{ color: "var(--ink)", margin: "0 0 2px", fontWeight: 800 }}>Книга прочитана!</h3>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: 13 }}>«{activeBook.title}»</p>
          </div>

          {/* Star rating */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setStarRating(n)}
                style={{ border: 0, background: "transparent", fontSize: 34, cursor: "pointer", filter: n <= starRating ? "drop-shadow(0 2px 6px rgba(247,197,45,0.4))" : "none", color: n <= starRating ? "#f7c52d" : "rgba(0,0,0,0.12)", padding: 0 }}>
                ★
              </button>
            ))}
          </div>

          {/* Book format */}
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 7 }}>Формат книги</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {([
                { key: "paper", label: "📖 Бумажная" },
                { key: "digital", label: "💻 Эл. книга" },
                { key: "audio", label: "🎧 Аудио" },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setBookFormat(f.key)} style={{
                  border: "1.5px solid " + (bookFormat === f.key ? "var(--accent)" : "var(--line)"),
                  borderRadius: 12, padding: "9px 6px",
                  background: bookFormat === f.key ? "color-mix(in srgb, var(--accent-2), white 30%)" : "transparent",
                  color: bookFormat === f.key ? "var(--accent)" : "var(--muted)",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", lineHeight: 1.3,
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Binding (only for paper) */}
          {bookFormat === "paper" && (
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 7 }}>Тип переплёта</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {([
                  { key: "hard", label: "📦 Жёсткий" },
                  { key: "soft", label: "📄 Мягкий" },
                ] as const).map(b => (
                  <button key={b.key} onClick={() => setBinding(b.key)} style={{
                    border: "1.5px solid " + (binding === b.key ? "var(--accent)" : "var(--line)"),
                    borderRadius: 12, padding: "9px 6px",
                    background: binding === b.key ? "color-mix(in srgb, var(--accent-2), white 30%)" : "transparent",
                    color: binding === b.key ? "var(--accent)" : "var(--muted)",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleFinishBook} style={{ flex: 2, border: 0, borderRadius: 999, padding: "13px", background: "var(--accent)", color: "white", fontWeight: 700, cursor: "pointer" }}>Сохранить</button>
            <button onClick={() => setShowFinish(false)} style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 999, padding: "13px", background: "transparent", color: "var(--muted)", cursor: "pointer" }}>Отмена</button>
          </div>
        </div>
      )}

      {/* Book search */}
      {panel(
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--line)", background: "rgba(255,255,255,0.62)", borderRadius: 16, padding: "10px 14px", color: "var(--muted)" }}>
            <Search size={16} />
            <input
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setSearchEnabled(false); }}
              placeholder="Название книги или автор..."
              style={{ flex: 1, border: 0, outline: 0, background: "transparent", color: "var(--ink)", fontSize: 14 }}
              onKeyDown={e => e.key === "Enter" && setSearchEnabled(true)}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setSearchEnabled(true)} style={{ flex: 1, border: 0, borderRadius: 999, padding: "10px", background: "var(--accent)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Искать в каталогах
            </button>
            <button onClick={() => {
              const demo: BookSearchItem = { external_id: "demo-1", source: "demo", title: "Маленький принц", author: "Антуан де Сент-Экзюпери", cover: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=300&q=60", pages: 112, isbn: "" };
              handleAddBook(demo, "Читаю");
            }} style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 999, padding: "10px", background: "transparent", color: "var(--muted)", fontSize: 13, cursor: "pointer" }}>
              Демо-книга
            </button>
          </div>
          {searching && <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center" }}>Поиск...</p>}
          {searchResults.map((item, i) => (
            <div key={i} style={{ border: "1px solid var(--line)", background: "var(--paper)", borderRadius: 18, padding: 12, display: "grid", gridTemplateColumns: "52px 1fr", gap: 12, alignItems: "center" }}>
              <img src={item.cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=200&q=60"} alt={item.title}
                style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 10 }} />
              <div>
                <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>{item.title}</div>
                <div style={{ color: "var(--muted)", fontSize: 11, margin: "2px 0 8px" }}>{item.author}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Читаю", "Хочу прочитать"].map(s => (
                    <button key={s} onClick={() => handleAddBook(item, s)}
                      style={{ border: 0, borderRadius: 999, padding: "5px 10px", background: s === "Читаю" ? "var(--accent)" : "color-mix(in srgb, var(--accent-2), white 30%)", color: s === "Читаю" ? "white" : "var(--accent)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>,
        "Найти книгу"
      )}

      {/* Emotional ratings */}
      {activeBook && panel(
        <div style={{ display: "grid", gap: 10 }}>
          {RATING_KEYS.map(key => (
            <label key={key} style={{ display: "grid", gridTemplateColumns: "86px 1fr 22px", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{key}</span>
              <input type="range" min={0} max={10} value={ratings[key] || 0}
                onChange={e => setRatings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                style={{ accentColor: "var(--accent)" }} />
              <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>{ratings[key] || 0}</span>
            </label>
          ))}
        </div>,
        "Эмоциональные оценки"
      )}

      {/* Quote & Note */}
      {activeBook && panel(
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            value={quote}
            onChange={e => setQuote(e.target.value)}
            placeholder="Любимая цитата из книги..."
            rows={2}
            style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,0.65)", color: "var(--ink)", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit" }}
          />
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ваши мысли о книге..."
            rows={3}
            style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "10px 12px", background: "rgba(255,255,255,0.65)", color: "var(--ink)", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit" }}
          />
        </div>,
        "Цитата и заметки"
      )}

      {/* Stickers */}
      {activeBook && panel(
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {STICKERS.map(s => (
            <button key={s} onClick={() => toggleSticker(s)}
              style={{ border: 0, borderRadius: 999, padding: "7px 12px", background: selectedStickers.includes(s) ? "var(--accent)" : "color-mix(in srgb, var(--accent-2), white 38%)", color: selectedStickers.includes(s) ? "white" : "var(--accent)", fontSize: 13, cursor: "pointer" }}>
              {s}
            </button>
          ))}
        </div>,
        "Стикеры настроения"
      )}

      {/* Music */}
      {activeBook && panel(
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line)", background: "rgba(255,255,255,0.62)", borderRadius: 14, padding: "10px 12px" }}>
              <Music size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input
                value={musicQ}
                onChange={e => { setMusicQ(e.target.value); setMusicSearchEnabled(false); }}
                placeholder="Найти трек..."
                onKeyDown={e => e.key === "Enter" && setMusicSearchEnabled(true)}
                style={{ flex: 1, border: 0, outline: 0, background: "transparent", color: "var(--ink)", fontSize: 13 }}
              />
            </div>
            <button onClick={() => setMusicSearchEnabled(true)} style={{ border: 0, borderRadius: 14, padding: "0 14px", background: "var(--accent)", color: "white", fontSize: 13, cursor: "pointer" }}>Найти</button>
          </div>
          {musicSearching && <p style={{ color: "var(--muted)", fontSize: 13 }}>Поиск...</p>}
          {Object.keys(selectedMusic).length > 0 && (
            <div style={{ padding: 10, background: "color-mix(in srgb, var(--accent-2), white 30%)", borderRadius: 14 }}>
              {Object.entries(selectedMusic).map(([track, artist]) => (
                <div key={track} style={{ fontSize: 13, color: "var(--ink)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>{track}</span>
                  <span style={{ color: "var(--muted)" }}>{artist}</span>
                </div>
              ))}
            </div>
          )}
          {musicResults.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              {t.cover && <img src={t.cover} alt={t.title} style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover" }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                <div style={{ color: "var(--muted)", fontSize: 11 }}>{t.artist}</div>
              </div>
              <button onClick={() => setSelectedMusic(prev => ({ ...prev, [t.title]: t.artist }))}
                style={{ border: 0, background: "transparent", color: "var(--accent)", cursor: "pointer", display: "flex", padding: 4 }}>
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>,
        "Музыка книги"
      )}

      {/* Images */}
      {activeBook && panel(
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line)", background: "rgba(255,255,255,0.62)", borderRadius: 14, padding: "10px 12px" }}>
              <Image size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input
                value={imageQ}
                onChange={e => { setImageQ(e.target.value); setImageSearchEnabled(false); }}
                placeholder="Найти картинки..."
                onKeyDown={e => e.key === "Enter" && setImageSearchEnabled(true)}
                style={{ flex: 1, border: 0, outline: 0, background: "transparent", color: "var(--ink)", fontSize: 13 }}
              />
            </div>
            <button onClick={() => setImageSearchEnabled(true)} style={{ border: 0, borderRadius: 14, padding: "0 14px", background: "var(--accent)", color: "white", fontSize: 13, cursor: "pointer" }}>Найти</button>
          </div>
          {imageSearching && <p style={{ color: "var(--muted)", fontSize: 13 }}>Поиск...</p>}
          {imageResults.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {imageResults.map((img, i) => {
                const selected = selectedImages.includes(img.url);
                return (
                  <div key={i} style={{ position: "relative", cursor: "pointer" }} onClick={() => setSelectedImages(prev => selected ? prev.filter(x => x !== img.url) : [...prev, img.url])}>
                    <img src={img.thumb || img.url} alt={img.title || ""} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10, opacity: selected ? 0.7 : 1, border: selected ? "2px solid var(--accent)" : "2px solid transparent" }} />
                    {selected && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={20} color="var(--accent)" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>,
        "Картинки к книге"
      )}

      {/* Save diary */}
      {activeBook && (
        <button
          onClick={handleSaveDiary}
          disabled={savingDiary}
          style={{ border: 0, borderRadius: 999, padding: "14px", background: savedDiary ? "#5d8b67" : "var(--accent)", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Check size={16} />
          {savedDiary ? "Сохранено!" : savingDiary ? "Сохраняю..." : "Сохранить запись в дневник"}
        </button>
      )}

      {/* Multi-book selector */}
      {books.filter(b => b.status === "Читаю").length > 1 && panel(
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {books.filter(b => b.status === "Читаю").map(book => (
            <button
              key={book.id}
              onClick={() => { setActiveBook(book.id); setPickerPage(book.read_pages || 1); }}
              style={{
                border: book.id === activeBook?.id ? "2px solid var(--accent)" : "1px solid var(--line)",
                background: book.id === activeBook?.id ? "color-mix(in srgb, var(--accent-2), white 30%)" : "transparent",
                borderRadius: 16, padding: "10px 12px", cursor: "pointer",
                display: "grid", gridTemplateColumns: "42px 1fr", gap: 10, alignItems: "center", textAlign: "left",
              }}
            >
              <img src={book.cover || ""} alt={book.title} style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 8 }} />
              <div>
                <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>{book.title}</div>
                <div style={{ color: "var(--muted)", fontSize: 11 }}>{book.read_pages || 0} / {book.pages || "?"} стр.</div>
              </div>
            </button>
          ))}
        </div>,
        "Читаю сейчас"
      )}
    </div>
  );
}
