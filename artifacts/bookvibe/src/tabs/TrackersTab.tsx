import { useListBooks } from "@workspace/api-client-react";
import type { Book } from "@workspace/api-client-react";
import { TrendingUp, BookOpen, Flame, ChevronLeft, ChevronRight, BarChart2, CalendarDays } from "lucide-react";
import { useState } from "react";
import { getSessionsByDate } from "@/hooks/useReadingSessions";
import type { ReadingSession } from "@/hooks/useReadingSessions";
import { pluralize } from "@/lib/pluralize";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const MONTH_NAMES = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];
const DAY_LABELS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const GENRE_COLORS = ["#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#f97316","#6366f1","#14b8a6"];

const ALL_GENRES = [
  "романтика","детектив","магия","академия","фэнтези",
  "ужасы","мистика","исторический","contemporary","sci-fi",
  "slow burn","уютное чтение","стекло","атмосфера",
];

function calcStreak(sessionMap: Record<string, ReadingSession[]>): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (sessionMap[d.toDateString()]) streak++;
    else if (i > 0 && streak === 0) break;
    else if (streak > 0) break;
  }
  return streak;
}

const COVER_W = 28;
const COVER_H = 42;
const STACK_OFFSET = 8;

function DayCell({ day, sessions, isToday }: { day: number; sessions: ReadingSession[]; isToday: boolean }) {
  const hasBooks = sessions.length > 0;
  const totalPagesRead = sessions.reduce((sum, s) => sum + s.pagesRead, 0);
  const displayed = sessions.slice(0, 3);
  const extra = sessions.length > 3 ? sessions.length - 3 : 0;
  const stackWidth = displayed.length > 1
    ? COVER_W + (displayed.length - 1) * STACK_OFFSET
    : COVER_W;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 104 }}>
      <span style={{
        fontSize: 10, fontWeight: isToday ? 800 : 500,
        color: isToday ? "var(--accent)" : "var(--muted)",
        lineHeight: 1, paddingLeft: 1,
      }}>
        {day}
      </span>
      <div style={{
        flex: 1,
        borderRadius: 10,
        border: `1.5px solid ${isToday ? "var(--accent)" : hasBooks ? "color-mix(in srgb, var(--accent), white 45%)" : "rgba(0,0,0,0.06)"}`,
        background: hasBooks
          ? "color-mix(in srgb, var(--accent), white 88%)"
          : isToday ? "color-mix(in srgb, var(--accent), white 82%)" : "rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px 2px",
        gap: 4,
        overflow: "hidden",
        transition: "all 0.2s",
      }}>
        {hasBooks ? (
          <>
            <div style={{ position: "relative", width: stackWidth, height: COVER_H, flexShrink: 0 }}>
              {displayed.map((session, idx) => (
                <div
                  key={idx}
                  title={session.bookTitle}
                  style={{
                    position: "absolute",
                    left: idx * STACK_OFFSET,
                    top: 0,
                    width: COVER_W,
                    height: COVER_H,
                    zIndex: idx + 1,
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.65)",
                    boxShadow: idx > 0 ? "-2px 0 6px rgba(0,0,0,0.20)" : "0 1px 4px rgba(0,0,0,0.12)",
                  }}
                >
                  {session.bookCover ? (
                    <img
                      src={session.bookCover}
                      alt={session.bookTitle}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", height: "100%",
                      background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12,
                    }}>
                      📖
                    </div>
                  )}
                  {idx === 2 && extra > 0 && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(0,0,0,0.50)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800, color: "white",
                    }}>
                      +{extra}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {totalPagesRead > 0 && (
              <div style={{
                fontSize: 8, fontWeight: 700,
                color: "var(--accent)",
                lineHeight: 1,
                letterSpacing: 0,
              }}>
                {totalPagesRead}с
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function CalendarView({ books }: { books: Book[] }) {
  const sessionMap = getSessionsByDate();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const streak = calcStreak(sessionMap);
  const totalPages = books.reduce((acc, b) => acc + (b.read_pages || 0), 0);
  const finished = books.filter(b => b.status === "Прочитано").length;

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  let readingDaysThisMonth = 0;
  let totalPagesThisMonth = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const ds = new Date(viewYear, viewMonth, i).toDateString();
    if (sessionMap[ds]) {
      readingDaysThisMonth++;
      totalPagesThisMonth += sessionMap[ds].reduce((sum, s) => sum + s.pagesRead, 0);
    }
  }
  const readingPercentage = Math.round((readingDaysThisMonth / daysInMonth) * 100);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const today = now.toDateString();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const currentBook = books.find(b => b.status === "Читаю");
  const pagesLeft = currentBook ? (currentBook.pages || 0) - (currentBook.read_pages || 0) : 0;
  const daysToFinish = pagesLeft > 0 ? Math.ceil(pagesLeft / 35) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[
          { icon: TrendingUp, label: "Страниц", value: totalPages },
          { icon: BookOpen, label: pluralize(finished, "Книга", "Книги", "Книг"), value: finished },
          { icon: Flame, label: `${pluralize(streak, "день", "дня", "дней")} подряд`, value: streak },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 18, padding: "12px 10px", display: "grid", gap: 3 }}>
            <Icon size={16} style={{ color: "var(--accent)" }} />
            <b style={{ fontSize: 22, color: "var(--accent)", lineHeight: 1 }}>{value}</b>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 20, padding: "14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button onClick={prevMonth} style={{ border: 0, background: "transparent", color: "var(--accent)", cursor: "pointer", padding: 4, display: "flex" }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink)" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {readingDaysThisMonth} из {daysInMonth} {pluralize(daysInMonth, "день", "дня", "дней")} ({readingPercentage}%)
            </div>
          </div>
          <button onClick={nextMonth} style={{ border: 0, background: "transparent", color: "var(--accent)", cursor: "pointer", padding: 4, display: "flex" }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {readingPercentage > 0 && (
          <div style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--accent), white 85%), color-mix(in srgb, var(--accent-2), white 80%))",
            borderRadius: 12, padding: 10, marginBottom: 12, textAlign: "center"
          }}>
            <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>
              {readingPercentage === 100 ? "🔥 Вы читаете каждый день!" : readingPercentage >= 70 ? "🌟 Отличный месяц!" : "📚 Хороший прогресс!"}
            </div>
            <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>
              {totalPagesThisMonth} {pluralize(totalPagesThisMonth, "страница", "страницы", "страниц")} прочитано в этом месяце
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 9, color: "var(--muted)", fontWeight: 700 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const ds = new Date(viewYear, viewMonth, day).toDateString();
            return <DayCell key={day} day={day} sessions={sessionMap[ds] || []} isToday={ds === today} />;
          })}
        </div>
      </div>

      {currentBook && (
        <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 20, padding: 14 }}>
          <h4 style={{ color: "var(--ink)", margin: "0 0 10px", fontWeight: 700, fontSize: 13 }}>Прогноз завершения</h4>
          <div style={{ display: "grid", gridTemplateColumns: "54px 1fr", gap: 12, alignItems: "center" }}>
            <img src={currentBook.cover || ""} alt={currentBook.title}
              style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 8 }} />
            <div>
              <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>{currentBook.title}</div>
              <div style={{ color: "var(--muted)", fontSize: 11, margin: "2px 0 8px" }}>{currentBook.author}</div>
              <div style={{ height: 7, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden", marginBottom: 4 }}>
                <div style={{
                  height: "100%", borderRadius: "inherit",
                  background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                  width: `${currentBook.pages ? Math.min(100, Math.round((currentBook.read_pages || 0) / currentBook.pages * 100)) : 0}%`,
                }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{currentBook.read_pages || 0} / {currentBook.pages || "?"} стр.</div>
              {daysToFinish && (
                <div style={{ marginTop: 6, padding: "6px 10px", background: "color-mix(in srgb, var(--accent-2), white 30%)", borderRadius: 10, fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                  При 35 стр/день: ещё {daysToFinish} {pluralize(daysToFinish, "день", "дня", "дней")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsView({ books }: { books: Book[] }) {
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [pagesFilter, setPagesFilter] = useState<"any" | "short" | "medium" | "long">("any");
  const [ratingFilter, setRatingFilter] = useState<"any" | "high" | "top">("any");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingGenre, setPendingGenre] = useState<string[]>([]);
  const [pendingPages, setPendingPages] = useState<"any" | "short" | "medium" | "long">("any");
  const [pendingRating, setPendingRating] = useState<"any" | "high" | "top">("any");

  const openFilter = () => {
    setPendingGenre(genreFilter);
    setPendingPages(pagesFilter);
    setPendingRating(ratingFilter);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setGenreFilter(pendingGenre);
    setPagesFilter(pendingPages);
    setRatingFilter(pendingRating);
    setFilterOpen(false);
  };

  const resetFilter = () => {
    setPendingGenre([]);
    setPendingPages("any");
    setPendingRating("any");
  };

  const finished = books.filter(b => b.status === "Прочитано");
  const totalPages = books.reduce((acc, b) => acc + (b.read_pages || 0), 0);
  const totalBooks = finished.length;

  const genreCount: Record<string, number> = {};
  books.forEach(b => {
    (b.vibe || []).forEach((tag: string) => {
      genreCount[tag] = (genreCount[tag] || 0) + 1;
    });
  });
  const genreData = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const ratingDist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  books.forEach(b => {
    if (b.rating && b.rating > 0) {
      const r = Math.round(b.rating).toString();
      if (ratingDist[r] !== undefined) ratingDist[r]++;
    }
  });
  const ratingData = Object.entries(ratingDist).map(([star, count]) => ({ star: `${star}★`, count }));

  const ratedBooks = books.filter(b => (b.rating || 0) > 0);
  const avgRating = ratedBooks.length > 0
    ? (ratedBooks.reduce((acc, b) => acc + (b.rating || 0), 0) / ratedBooks.length).toFixed(1)
    : "—";

  const filteredBooks = books.filter(b => {
    if (genreFilter.length > 0 && !genreFilter.some(g => (b.vibe || []).includes(g))) return false;
    if (pagesFilter === "short" && (b.pages || 0) >= 200) return false;
    if (pagesFilter === "medium" && ((b.pages || 0) < 200 || (b.pages || 0) > 400)) return false;
    if (pagesFilter === "long" && (b.pages || 0) <= 400) return false;
    if (ratingFilter === "high" && (b.rating || 0) < 4) return false;
    if (ratingFilter === "top" && (b.rating || 0) < 5) return false;
    return true;
  });

  const hasActiveFilters = genreFilter.length > 0 || pagesFilter !== "any" || ratingFilter !== "any";

  const card = (children: React.ReactNode, title?: string) => (
    <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 20, padding: 14 }}>
      {title && <h4 style={{ color: "var(--ink)", margin: "0 0 12px", fontWeight: 700, fontSize: 13 }}>{title}</h4>}
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[
          { label: "Страниц прочитано", value: totalPages.toLocaleString("ru") },
          { label: "Книг завершено", value: totalBooks },
          { label: "Средняя оценка", value: avgRating },
        ].map(({ label, value }) => (
          <div key={label} style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 18, padding: "12px 10px", textAlign: "center" }}>
            <b style={{ fontSize: 20, color: "var(--accent)", display: "block", lineHeight: 1.1 }}>{value}</b>
            <span style={{ color: "var(--muted)", fontSize: 10, lineHeight: 1.3, display: "block", marginTop: 4 }}>{label}</span>
          </div>
        ))}
      </div>

      {genreData.length > 0 ? card(
        <div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={genreData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                {genreData.map((_, i) => (
                  <Cell key={i} fill={GENRE_COLORS[i % GENRE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, n: string) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {genreData.map((d, i) => (
              <span key={d.name} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "var(--muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: GENRE_COLORS[i % GENRE_COLORS.length], display: "inline-block" }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>,
        "Жанры в библиотеке"
      ) : card(
        <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", margin: 0 }}>
          Добавьте книги и стикеры жанров чтобы видеть статистику
        </p>,
        "Жанры в библиотеке"
      )}

      {card(
        <div style={{ pointerEvents: "none" }}>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={ratingData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="star" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Bar dataKey="count" name="Книг" radius={[6, 6, 0, 0]} fill="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </div>,
        "Распределение оценок"
      )}

      <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 20, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h4 style={{ color: "var(--ink)", margin: 0, fontWeight: 700, fontSize: 13 }}>Фильтр библиотеки</h4>
          <button
            onClick={openFilter}
            style={{
              border: hasActiveFilters ? "1.5px solid var(--accent)" : "1px solid var(--line)",
              borderRadius: 10, padding: "6px 12px",
              background: hasActiveFilters ? "color-mix(in srgb, var(--accent), white 88%)" : "transparent",
              color: hasActiveFilters ? "var(--accent)" : "var(--muted)",
              fontSize: 12, cursor: "pointer", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            ⚙ Фильтр{hasActiveFilters ? ` (${genreFilter.length + (pagesFilter !== "any" ? 1 : 0) + (ratingFilter !== "any" ? 1 : 0)})` : ""}
          </button>
        </div>

        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>
          {filteredBooks.length} {pluralize(filteredBooks.length, "книга", "книги", "книг")}
          {hasActiveFilters && <span style={{ color: "var(--accent)", marginLeft: 6 }}>· фильтр применён</span>}
        </div>

        {filteredBooks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0", color: "var(--muted)", fontSize: 13 }}>
            Нет книг по выбранным фильтрам
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredBooks.map(book => (
              <div key={book.id} style={{
                display: "grid", gridTemplateColumns: "44px 1fr auto",
                gap: 10, alignItems: "center",
                padding: "8px 10px", borderRadius: 14,
                background: "rgba(255,255,255,0.55)",
                border: "1px solid var(--line)",
              }}>
                <img src={book.cover || ""} alt={book.title}
                  style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 7 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{book.author}</div>
                  {(book.vibe || []).length > 0 && (
                    <div style={{ fontSize: 9, color: "var(--accent)", marginTop: 3 }}>
                      {(book.vibe || []).slice(0, 3).join(" · ")}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>
                    {(book.rating || 0) > 0 ? `${"★".repeat(Math.round(book.rating || 0))}` : ""}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--muted)" }}>{book.pages || "?"} стр.</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 1 }}>{book.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filterOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={() => setFilterOpen(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 480,
              background: "var(--paper)", borderRadius: "28px 28px 0 0",
              padding: "20px 18px 32px",
              boxShadow: "0 -8px 40px rgba(44,33,27,0.18)",
              maxHeight: "80dvh", overflowY: "auto",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "var(--ink)" }}>Фильтр библиотеки</h3>
              <button
                onClick={resetFilter}
                style={{ border: 0, background: "transparent", color: "var(--muted)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
              >
                Сбросить
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, marginBottom: 8 }}>Жанр</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ALL_GENRES.map(g => (
                    <button key={g}
                      onClick={() => setPendingGenre(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                      style={{
                        border: 0, borderRadius: 999, padding: "6px 12px",
                        background: pendingGenre.includes(g) ? "var(--accent)" : "color-mix(in srgb, var(--accent-2), white 40%)",
                        color: pendingGenre.includes(g) ? "white" : "var(--accent)",
                        fontSize: 12, cursor: "pointer", fontWeight: 600,
                      }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, marginBottom: 8 }}>Количество страниц</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { key: "any", label: "Любое" },
                    { key: "short", label: "< 200" },
                    { key: "medium", label: "200–400" },
                    { key: "long", label: "400+" },
                  ].map(o => (
                    <button key={o.key}
                      onClick={() => setPendingPages(o.key as typeof pagesFilter)}
                      style={{
                        flex: 1, border: "1px solid var(--line)", borderRadius: 10, padding: "8px 4px",
                        background: pendingPages === o.key ? "var(--accent)" : "transparent",
                        color: pendingPages === o.key ? "white" : "var(--muted)",
                        fontSize: 11, cursor: "pointer", fontWeight: 600,
                      }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, marginBottom: 8 }}>Оценка</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { key: "any", label: "Любая" },
                    { key: "high", label: "4★ и выше" },
                    { key: "top", label: "5★" },
                  ].map(o => (
                    <button key={o.key}
                      onClick={() => setPendingRating(o.key as typeof ratingFilter)}
                      style={{
                        flex: 1, border: "1px solid var(--line)", borderRadius: 10, padding: "8px 4px",
                        background: pendingRating === o.key ? "var(--accent)" : "transparent",
                        color: pendingRating === o.key ? "white" : "var(--muted)",
                        fontSize: 11, cursor: "pointer", fontWeight: 600,
                      }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={applyFilter}
              style={{
                width: "100%", marginTop: 20,
                border: 0, borderRadius: 16, padding: "13px",
                background: "var(--accent)", color: "white",
                fontWeight: 800, fontSize: 15, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              ✓ Применить фильтр
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TrackersTab() {
  const { data } = useListBooks();
  const books: Book[] = data?.items || [];
  const [view, setView] = useState<"calendar" | "stats">("calendar");

  return (
    <div style={{ padding: "14px 16px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        background: "rgba(0,0,0,0.06)", borderRadius: 14, padding: 3,
      }}>
        {([
          { key: "calendar", label: "Трекер", icon: CalendarDays },
          { key: "stats", label: "Статистика", icon: BarChart2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            style={{
              border: 0, borderRadius: 11, padding: "10px",
              background: view === key ? "var(--paper)" : "transparent",
              color: view === key ? "var(--accent)" : "var(--muted)",
              fontWeight: view === key ? 700 : 500,
              fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: view === key ? "0 2px 8px rgba(44,33,27,0.10)" : "none",
              transition: "all 0.2s",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {view === "calendar" ? <CalendarView books={books} /> : <StatsView books={books} />}
    </div>
  );
}
