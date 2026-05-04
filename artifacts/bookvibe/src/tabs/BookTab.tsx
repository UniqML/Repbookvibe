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

  const TIMER_RUNNING_KEY = "bookvibe_reading_timer_running";
  const TIMER_SECONDS_KEY = "bookvibe_reading_timer_seconds";
  const TIMER_UPDATED_AT_KEY = "bookvibe_reading_timer_updated_at";
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showSession, setShowSession] = useState(false);
  const [pickerPage, setPickerPage] = useState<number | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [bookShelfUpdateBusy, setBookShelfUpdateBusy] = useState<number | null>(null);

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

  const toggleFavorite = async (book: Book) => {
    if (!book?.id) return;
    setBookShelfUpdateBusy(book.id);
    try {
      const nextShelf = book.shelf === "Любимые" ? (book.status === "Хочу прочитать" ? "Хочу прочитать" : "Новые") : "Любимые";
      await saveBook({
        data: {
          id: book.id,
          title: book.title,
          author: book.author || "",
          cover: book.cover || "",
          pages: book.pages || 0,
          read_pages: book.read_pages || 0,
          isbn: book.isbn || "",
          status: book.status,
          shelf: nextShelf,
          vibe: book.vibe || [],
          rating: book.rating || 0,
        },
      });
      qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
    } finally {
      setBookShelfUpdateBusy(null);
    }
  };

  const openReadingForBook = (book: Book) => {
    setActiveBook(book.id);
    setPickerPage(book.read_pages || 1);
    setShowSession(true);
  };

  const handleAddBook = async (item: BookSearchItem, status: string, shelf: string = "Новые") => {
    const result = await saveBook({ data: { title: item.title, author: item.author || "", cover: item.cover || "", pages: item.pages || 0, isbn: item.isbn || "", external_id: item.external_id, source: item.source, description: item.description || "", status, shelf, vibe: [] } });
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
        cover: activeBook.cover || "", pages,
        read_pages: newPage,
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
  const shelfBooks = (shelfName: string) => books.filter(b => b.shelf === shelfName);

  return (
    <div style={{ padding: "14px 18px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
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
                <span style={{ fontSize: 11, color: "var(--muted)", cursor: "pointer" }} onClick={() => openReadingForBook(activeBook)}>{readPagesVal} / {pages} стр. ({progressPct}%)</span>
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

      {sessionSaved && (
        <div style={{ background: "var(--accent)", color: "white", borderRadius: 18, padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
          ✓ Сеанс чтения сохранён в трекере!
        </div>
      )}

      {(shelfBooks("Хочу прочитать").length > 0 || shelfBooks("Любимые").length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {["Хочу прочитать", "Любимые"].map((shelfName) => {
            const shelfList = shelfBooks(shelfName);
            if (!shelfList.length) return null;
            return (
              <div key={shelfName} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h4 style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>{shelfName}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                  {shelfList.map(book => {
                    const favorite = book.shelf === "Любимые";
                    return (
                      <div key={book.id} style={{ position: "relative" }}>
                        <button
                          onClick={() => toggleFavorite(book)}
                          disabled={bookShelfUpdateBusy === book.id}
                          style={{ position: "absolute", top: 8, right: 8, zIndex: 2, width: 30, height: 30, borderRadius: "50%", border: 0, background: "rgba(255,255,255,0.9)", color: favorite ? "#ef4444" : "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                          aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"}
                        >
                          ❤
                        </button>
                        <button
                          onClick={() => openReadingForBook(book)}
                          style={{ width: "100%", padding: 0, border: 0, background: "transparent", textAlign: "left", cursor: "pointer" }}
                        >
                          <img
                            src={book.cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=300&q=60"}
                            alt={book.title}
                            style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 18, boxShadow: "0 8px 24px rgba(44,33,27,0.12)" }}
                          />
                          <div style={{ padding: "8px 4px 0" }}>
                            <div style={{ color: "var(--ink)", fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{book.title}</div>
                            <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>{book.author}</div>
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

      {activeBook && activeBook.status === "Читаю" && (
        <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 24, padding: 16, boxShadow: "0 4px 16px rgba(44,33,27,0.06)" }}>
          <h4 style={{ color: "var(--ink)", margin: "0 0 12px", fontWeight: 700, fontSize: 14 }}>Сеанс чтения</h4>

          {!showSession ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
    </div>
  );
}
