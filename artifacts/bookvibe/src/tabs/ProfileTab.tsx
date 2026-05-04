import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReadingGoal } from "@/hooks/useReadingGoal";
import { useAchievements } from "@/hooks/useAchievements";
import { AuthForm } from "@/components/AuthForm";
import { useListBooks, useListDiaryEntries } from "@workspace/api-client-react";
import type { Book, DiaryEntry } from "@workspace/api-client-react";
import { useLanguage } from "@/hooks/useLanguage";
import { BookCardModal } from "@/components/BookCardModal";
import { DiaryDetailModal } from "@/components/DiaryDetailModal";
import { UserAvatar } from "@/components/UserAvatar";
import { generateAvatarSeeds, getDefaultAvatarSeed } from "@/lib/avatar";
import { LogOut, Target, Trophy, BookOpen } from "lucide-react";

export function ProfileTab() {
  const { user, logout, updateProfile } = useAuth();
  const { t, lang } = useLanguage();
  const { data: booksData } = useListBooks();
  const books: Book[] = booksData?.items || [];
  const { data: diaryData } = useListDiaryEntries();
  const diaryEntries = diaryData?.items || [];
  const diaryCount = diaryEntries.length;

  const { getGoal, setGoal, deleteGoal } = useReadingGoal();
  const goal = getGoal();

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedDiaryEntry, setSelectedDiaryEntry] = useState<DiaryEntry | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState(goal?.targetBooks.toString() || "50");
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);

  const finished = books.filter(b => b.status === "Прочитано");
  const totalPages = books.reduce((acc, b) => acc + (b.read_pages || 0), 0);
  const { achievements, unlockedCount, totalAchievements } = useAchievements(finished.length, totalPages);

  const getDiaryForBook = (bookId: number) => {
    return diaryEntries.find((d: any) => d.book_id === bookId);
  };

  const getBookForEntry = (bookId: number): Book | null => {
    return books.find((b) => b.id === bookId) || null;
  };

  const displayName = user?.displayName || (t("guestAccount"));
  const avatarSeed = user?.avatarSeed || localStorage.getItem("bookvibe_avatar_seed") || getDefaultAvatarSeed(user);
  const avatarOptions = generateAvatarSeeds(user?.email || displayName);
  const isGuest = user?.isAnonymous;

  const setAvatarSeedLocal = (seed: string) => {
    try {
      localStorage.setItem("bookvibe_avatar_seed", seed);
    } catch {}
  };

  const handleNameSave = async () => {
    if (newName.trim() && newName !== displayName) {
      setUpdating(true);
      try {
        await updateProfile(newName.trim());
        setEditingName(false);
      } catch (error) {
        console.error("Failed to update name:", error);
        setNewName(displayName);
      }
      setUpdating(false);
    }
  };

  const handleAvatarSelect = async (seed: string) => {
    setUpdating(true);
    try {
      setAvatarSeedLocal(seed);
      await updateProfile(undefined, undefined, seed);
      setShowAvatarPicker(false);
    } catch (error) {
      console.error("Failed to update avatar:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleAvatarPicker = () => {
    setShowAvatarPicker((value) => !value);
  };

  const handleAvatarSelectLocalOnly = (seed: string) => {
    setAvatarSeedLocal(seed);
    setShowAvatarPicker(false);
  };

  const handleSetGoal = () => {
    const num = parseInt(goalInput);
    if (num > 0) {
      const year = new Date().getFullYear();
      setGoal(num, year);
      setShowGoalModal(false);
    }
  };

  const handleDeleteGoal = () => {
    deleteGoal();
    setShowGoalModal(false);
  };

  const progressPercentage = goal ? Math.round((finished.length / goal.targetBooks) * 100) : 0;

  const panel = (children: React.ReactNode, title?: string) => (
    <div style={{ border: "1px solid var(--line)", background: "var(--paper-soft)", borderRadius: 24, padding: 16, boxShadow: "0 4px 16px rgba(44,33,27,0.06)" }}>
      {title && <h4 style={{ color: "var(--ink)", margin: "0 0 12px", fontWeight: 700, fontSize: 14 }}>{title}</h4>}
      {children}
    </div>
  );

  return (
    <div style={{ padding: "14px 18px 28px", display: "flex", flexDirection: "column", gap: 14 }}>

      {!isGuest ? (
        panel(
          <div>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
              <button style={{
                width: 80, height: 80, borderRadius: 22,
                border: 0, padding: 0, background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onClick={handleToggleAvatarPicker}
              title="Нажмите для изменения аватарки">
                <UserAvatar seed={avatarSeed} name={displayName} email={user?.email} id={user?.id} size={80} radius={22} />
              </button>
              
              <div style={{ flex: 1 }}>
                {editingName ? (
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoFocus
                      style={{
                        flex: 1,
                        border: "1px solid var(--accent)",
                        borderRadius: 12,
                        padding: "8px 12px",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--ink)",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={handleNameSave}
                      disabled={updating}
                      style={{
                        border: 0,
                        borderRadius: 12,
                        padding: "8px 12px",
                        background: "var(--accent)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: updating ? "default" : "pointer",
                      }}
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <h3 style={{
                    color: "var(--ink)",
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: 8,
                    display: "inline-block",
                  }}
                  onClick={() => {
                    setEditingName(true);
                    setNewName(displayName);
                  }}
                  title="Нажмите для редактирования">
                    {displayName}
                  </h3>
                )}
                <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: 13 }}>
                  {user?.email || "Аккаунт"}
                </p>
              </div>

              <button
                onClick={logout}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: "8px 10px",
                  background: "transparent",
                  color: "var(--muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                }}
                title="Выйти из аккаунта"
              >
                <LogOut size={14} />
                Выход
              </button>
            </div>

            {showAvatarPicker && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                padding: 12,
                background: "rgba(0, 0, 0, 0.03)",
                borderRadius: 16,
                marginBottom: 12,
              }}>
                <div style={{
                  gridColumn: "1 / -1",
                  fontSize: 12,
                  color: "var(--muted)",
                  fontWeight: 700,
                  padding: "0 2px 4px",
                }}>
                  Сменить аватарку
                </div>
                {avatarOptions.map((seed) => (
                  <button
                    key={seed}
                    onClick={() => handleAvatarSelectLocalOnly(seed)}
                    disabled={updating}
                    style={{
                      border: avatarSeed === seed ? "2px solid var(--accent)" : "1px solid var(--line)",
                      borderRadius: 12,
                      padding: 4,
                      background: "rgba(255,255,255,0.65)",
                      cursor: updating ? "default" : "pointer",
                      transition: "all 0.15s",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <UserAvatar seed={seed} size={48} radius={10} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        <AuthForm />
      )}

      {!isGuest && goal && panel(
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Target size={18} style={{ color: "var(--accent)" }} />
            <h3 style={{ margin: 0, color: "var(--ink)", fontWeight: 700, fontSize: 15 }}>
              {lang === "ru" ? "Ваша цель на" : "Your goal for"} {goal.targetYear}
            </h3>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)", marginBottom: 4 }}>
              {goal.targetBooks} {lang === "ru" ? "книг" : "books"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, progressPercentage)}%`,
                  background: progressPercentage >= 100 ? "var(--accent)" : "linear-gradient(90deg, var(--accent), var(--accent-2))",
                  borderRadius: "inherit",
                  transition: "width 0.3s"
                }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", minWidth: 45 }}>
                {progressPercentage}%
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {lang === "ru" ? "Прочитано" : "Read"}: <b style={{ color: "var(--ink)" }}>{finished.length}</b> / {goal.targetBooks}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {lang === "ru" ? "Осталось" : "Left"}: <b style={{ color: "var(--ink)" }}>{Math.max(0, goal.targetBooks - finished.length)}</b>
              </div>
            </div>
            {finished.length < goal.targetBooks && (
              <div style={{ 
                background: "color-mix(in srgb, var(--accent-2), white 30%)",
                borderRadius: 10, padding: "8px 10px",
                fontSize: 12, color: "var(--accent)", fontWeight: 600, textAlign: "center"
              }}>
                🎯 {lang === "ru" ? "Еще" : "Only"} {goal.targetBooks - finished.length} {lang === "ru" ? "книг до цели!" : "books to go!"}
              </div>
            )}
            {finished.length >= goal.targetBooks && (
              <div style={{ 
                background: "color-mix(in srgb, var(--accent), white 20%)",
                borderRadius: 10, padding: "8px 10px",
                fontSize: 12, color: "var(--accent)", fontWeight: 700, textAlign: "center"
              }}>
                🔥 {lang === "ru" ? "Цель достигнута!" : "Goal achieved!"}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            style={{
              width: "100%",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: "8px 12px",
              background: "transparent",
              color: "var(--muted)",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {lang === "ru" ? "Изменить цель" : "Edit goal"}
          </button>
        </div>,
        ""
      )}

      {!isGuest && !goal && panel(
        <div style={{ textAlign: "center" }}>
          <Target size={32} style={{ color: "var(--accent)", marginBottom: 8 }} />
          <h3 style={{ margin: "0 0 4px", color: "var(--ink)", fontWeight: 700, fontSize: 15 }}>
            {lang === "ru" ? "Установите цель" : "Set a reading goal"}
          </h3>
          <p style={{ margin: "4px 0 12px", color: "var(--muted)", fontSize: 12 }}>
            {lang === "ru" ? "Сколько книг вы хотите прочитать?" : "How many books do you want to read?"}
          </p>
          <button
            onClick={() => setShowGoalModal(true)}
            style={{
              width: "100%",
              border: 0,
              borderRadius: 12,
              padding: "10px 12px",
              background: "var(--accent)",
              color: "white",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {lang === "ru" ? "Установить цель" : "Set goal"}
          </button>
        </div>,
        ""
      )}

      {!isGuest && panel(
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>
                {finished.length}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {lang === "ru" ? "Прочитано" : "Completed"} {lang === "ru" ? "книг" : "books"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>
                {totalPages}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {lang === "ru" ? "Прочитано" : "Read"} {lang === "ru" ? "страниц" : "pages"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>
                {diaryCount}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {lang === "ru" ? "записей в дневнике" : "diary entries"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>
                {books.length}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {lang === "ru" ? "в библиотеке" : "in library"}
              </div>
            </div>
          </div>
        </div>,
        lang === "ru" ? "Статистика" : "Statistics"
      )}

      {!isGuest && panel(
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { name: "Лина", seed: "bookvibe-friend-lina", meta: "Фэнтези · 34 книги" },
            { name: "Mira", seed: "bookvibe-friend-mira", meta: "Romance · 21 books" },
            { name: "Алекс", seed: "bookvibe-friend-alex", meta: "Детективы · 18 книг" },
          ].map((friend) => (
            <div key={friend.seed} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <UserAvatar seed={friend.seed} name={friend.name} size={32} radius={10} />
              <div>
                <div style={{ color: "var(--ink)", fontSize: 13, fontWeight: 800 }}>{friend.name}</div>
                <div style={{ color: "var(--muted)", fontSize: 11 }}>{friend.meta}</div>
              </div>
            </div>
          ))}
        </div>,
        lang === "ru" ? "Друзья" : "Friends"
      )}

      {!isGuest && panel(
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)", marginBottom: 2 }}>
              {unlockedCount}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {lang === "ru" ? "из" : "of"} {totalAchievements} {lang === "ru" ? "достижений" : "achievements"}
            </div>
          </div>
          <button
            onClick={() => setShowAchievementsModal(true)}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: "10px 16px",
              background: "transparent",
              color: "var(--accent)",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Trophy size={14} />
            {lang === "ru" ? "Смотреть" : "View"}
          </button>
        </div>,
        lang === "ru" ? "Достижения" : "Achievements"
      )}

      {/* Diary feed */}
      {!isGuest && panel(
        <div>
          {diaryEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <BookOpen size={40} style={{ color: "var(--accent)", opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: "0 0 4px", color: "var(--ink)", fontWeight: 700, fontSize: 14 }}>
                Дневник пока пуст
              </p>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
                Добавьте первую запись в разделе «Книга»
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(diaryEntries as DiaryEntry[]).map((entry) => {
                const book = getBookForEntry(entry.book_id);
                const stickers = entry.stickers || [];
                const hasImages = (entry.images || []).length > 0;
                const hasMusic = entry.music && Object.keys(entry.music).length > 0;
                const notePreview = entry.note
                  ? entry.note.length > 100 ? entry.note.slice(0, 100) + "…" : entry.note
                  : null;
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedDiaryEntry(entry)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "52px 1fr",
                      gap: 12,
                      padding: "12px",
                      border: "1px solid var(--line)",
                      borderRadius: 18,
                      background: "var(--paper)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "box-shadow 0.15s, transform 0.15s",
                      boxShadow: "0 2px 8px rgba(44,33,27,0.05)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(44,33,27,0.12)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(44,33,27,0.05)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Cover */}
                    <img
                      src={book?.cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=200&q=60"}
                      alt={book?.title || "Книга"}
                      style={{ width: 52, height: 78, objectFit: "cover", borderRadius: 10, flexShrink: 0 }}
                    />
                    {/* Content */}
                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontWeight: 800, color: "var(--ink)", fontSize: 13, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {book?.title || "Книга"}
                      </div>
                      {book?.author && (
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>{book.author}</div>
                      )}
                      {book?.rating ? (
                        <div style={{ color: "#f7c52d", fontSize: 12 }}>
                          {"★".repeat(Math.round(book.rating))}{"☆".repeat(5 - Math.round(book.rating))}
                        </div>
                      ) : null}
                      {notePreview && (
                        <div style={{ color: "var(--ink)", fontSize: 12, lineHeight: 1.5, opacity: 0.8 }}>
                          {notePreview}
                        </div>
                      )}
                      {!notePreview && entry.quote && (
                        <div style={{ color: "var(--ink)", fontSize: 12, fontStyle: "italic", opacity: 0.75 }}>
                          «{entry.quote.length > 80 ? entry.quote.slice(0, 80) + "…" : entry.quote}»
                        </div>
                      )}
                      {/* Pills row */}
                      {(stickers.length > 0 || hasImages || hasMusic) && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                          {stickers.slice(0, 3).map((s) => (
                            <span key={s} style={{
                              background: "color-mix(in srgb, var(--accent-2), white 35%)",
                              color: "var(--accent)", padding: "2px 8px",
                              borderRadius: 999, fontSize: 10, fontWeight: 600,
                            }}>
                              {s}
                            </span>
                          ))}
                          {stickers.length > 3 && (
                            <span style={{ color: "var(--muted)", fontSize: 10, padding: "2px 4px" }}>
                              +{stickers.length - 3}
                            </span>
                          )}
                          {hasImages && (
                            <span style={{ color: "var(--muted)", fontSize: 10, padding: "2px 4px" }}>🖼</span>
                          )}
                          {hasMusic && (
                            <span style={{ color: "var(--muted)", fontSize: 10, padding: "2px 4px" }}>🎵</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>,
        lang === "ru" ? "Мой дневник" : "My Diary"
      )}

      {selectedBook && (
        <BookCardModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          diaryEntry={getDiaryForBook(selectedBook.id)}
        />
      )}

      {selectedDiaryEntry && (
        <DiaryDetailModal
          entry={selectedDiaryEntry}
          book={getBookForEntry(selectedDiaryEntry.book_id)}
          onClose={() => setSelectedDiaryEntry(null)}
        />
      )}

      {showGoalModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "flex-end",
          zIndex: 50,
        }} onClick={() => setShowGoalModal(false)}>
          <div style={{
            background: "var(--paper)",
            width: "100%",
            borderRadius: "20px 20px 0 0",
            padding: "20px 18px 28px",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.2)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: "var(--ink)", fontWeight: 700, fontSize: 16 }}>
                {lang === "ru" ? "Установить цель" : "Set reading goal"}
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                style={{
                  border: 0, background: "transparent",
                  color: "var(--muted)", cursor: "pointer",
                  fontSize: 20, width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                {lang === "ru" ? "Количество книг на год" : "Books per year"}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  min="1"
                  max="500"
                  style={{
                    flex: 1,
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontSize: 14,
                    color: "var(--ink)",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{
                  background: "var(--paper-soft)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  color: "var(--muted)",
                  fontSize: 14,
                  fontWeight: 600,
                  minWidth: 60,
                  textAlign: "center",
                }}>
                  {lang === "ru" ? "книг" : "books"}
                </div>
              </div>
            </div>

            {goal && (
              <div style={{ marginBottom: 12, padding: 12, background: "rgba(0,0,0,0.02)", borderRadius: 12 }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                  {lang === "ru" ? "Текущая цель:" : "Current goal:"} <b style={{ color: "var(--ink)" }}>{goal.targetBooks} книг</b>
                </p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {goal && (
                <button
                  onClick={handleDeleteGoal}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    background: "transparent",
                    color: "var(--muted)",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {lang === "ru" ? "Удалить" : "Delete"}
                </button>
              )}
              <button
                onClick={handleSetGoal}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "var(--accent)",
                  color: "white",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {lang === "ru" ? "Сохранить" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAchievementsModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "flex-end",
          zIndex: 50,
        }} onClick={() => setShowAchievementsModal(false)}>
          <div style={{
            background: "var(--paper)",
            width: "100%",
            borderRadius: "20px 20px 0 0",
            padding: "20px 18px 28px",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.2)",
            maxHeight: "80vh",
            overflowY: "auto",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy size={20} style={{ color: "var(--accent)" }} />
                <h3 style={{ margin: 0, color: "var(--ink)", fontWeight: 700, fontSize: 16 }}>
                  {lang === "ru" ? "Достижения" : "Achievements"}
                </h3>
              </div>
              <button
                onClick={() => setShowAchievementsModal(false)}
                style={{
                  border: 0, background: "transparent",
                  color: "var(--muted)", cursor: "pointer",
                  fontSize: 20, width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: "color-mix(in srgb, var(--accent), white 90%)", borderRadius: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--accent)", fontWeight: 600, textAlign: "center" }}>
                {unlockedCount} / {totalAchievements} {lang === "ru" ? "разблокировано" : "unlocked"}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {achievements.map(ach => (
                <div
                  key={ach.id}
                  style={{
                    border: "1px solid " + (ach.unlocked ? "var(--accent)" : "var(--line)"),
                    borderRadius: 14,
                    padding: 12,
                    background: ach.unlocked ? "color-mix(in srgb, var(--accent), white 95%)" : "rgba(0,0,0,0.02)",
                    opacity: ach.unlocked ? 1 : 0.6,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{ach.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
                    {ach.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {ach.description}
                  </div>
                  {ach.unlocked && (
                    <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, marginTop: 6 }}>
                      ✓ {lang === "ru" ? "Разблокировано" : "Unlocked"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
