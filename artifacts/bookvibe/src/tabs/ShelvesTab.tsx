import { useState } from "react";
import { Trash2, BookOpen, Search, Plus, Heart, Check, Library, BookMarked } from "lucide-react";
import { useListBooks, useDeleteBook, useSaveBook, getListBooksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Book } from "@workspace/api-client-react";
import { BookSearchModal } from "@/components/BookSearchModal";
import { useBookState } from "@/hooks/useBookState";

const STATUSES = [
  { label: "Все", icon: Library, color: "#8B7355", bgColor: "rgba(139, 115, 85, 0.1)" },
  { label: "Читаю", icon: BookMarked, color: "#FF6B6B", bgColor: "rgba(255, 107, 107, 0.1)" },
  { label: "Хочу прочитать", icon: BookOpen, color: "#4ECDC4", bgColor: "rgba(78, 205, 196, 0.1)" },
  { label: "Любимые", icon: Heart, color: "#FF1744", bgColor: "rgba(255, 23, 68, 0.1)" },
  { label: "Прочитано", icon: Check, color: "#5AB05A", bgColor: "rgba(90, 176, 90, 0.1)" },
];

interface ShelvesTabProps {
  onSelectBook?: () => void;
}

export function ShelvesTab({ onSelectBook }: ShelvesTabProps) {
  const [filter, setFilter] = useState("Все");
  const [search, setSearch] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null);
  const qc = useQueryClient();
  const { setActiveBook } = useBookState();

  const { data, isLoading } = useListBooks();
  const books: Book[] = data?.items || [];

  const { mutateAsync: deleteBook, isPending: deleting } = useDeleteBook();
  const { mutateAsync: saveBook } = useSaveBook();

  const filtered = books.filter(b => {
    const matchStatus = filter === "Все" || b.status === filter;
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase()) || (b.author || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getStatusConfig = (label: string) => STATUSES.find(s => s.label === label);

  const handleDelete = (book: Book) => {
    setPendingDelete(book);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteBook({ bookId: pendingDelete.id });
    qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
    setPendingDelete(null);
  };

  const handleBookClick = (book: Book) => {
    setActiveBook(book.id);
    onSelectBook?.();
  };

  const toggleFavorite = async (book: Book) => {
    const isFav = book.shelf === "Любимые";
    await saveBook({
      data: {
        id: book.id,
        title: book.title,
        author: book.author || "",
        cover: book.cover || "",
        pages: book.pages || 0,
        read_pages: book.read_pages || 0,
        isbn: book.isbn || "",
        status: book.status || "Хочу прочитать",
        shelf: isFav ? "Новые" : "Любимые",
        vibe: book.vibe || [],
        rating: book.rating || 0,
      }
    });
    qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
  };

  return (
    <div style={{ padding: "14px 18px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--line)",
          background: "rgba(255,255,255,0.62)", borderRadius: 18, padding: "10px 14px", color: "var(--muted)",
        }}>
          <Search size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или автору..."
            style={{ flex: 1, border: 0, outline: 0, background: "transparent", color: "var(--ink)", fontSize: 14, fontFamily: "inherit" }}
          />
        </div>
        <button
          onClick={() => setSearchModalOpen(true)}
          style={{
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: "10px 14px",
            background: "var(--accent)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 700,
            fontSize: 13,
          }}
          title="Найти книгу в Интернете"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {STATUSES.map(s => {
          const isActive = filter === s.label;
          const IconComponent = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => setFilter(s.label)}
              style={{
                flexShrink: 0,
                border: isActive ? `2px solid ${s.color}` : `1px solid ${s.color}`,
                borderRadius: 999,
                padding: "8px 14px",
                background: isActive ? s.color : s.bgColor,
                color: isActive ? "white" : s.color,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: isActive ? 700 : 600,
                transition: "all 0.2s ease",
              }}
            >
              <IconComponent size={14} />
              {s.label}
            </button>
          );
        })}
      </div>

      {isLoading && <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center" }}>Загрузка...</p>}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
          <BookOpen size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontWeight: 600, color: "var(--ink)" }}>Полка пуста</p>
          <p style={{ fontSize: 13 }}>Добавьте книги во вкладке «Книга»</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(book => {
          const isFav = book.shelf === "Любимые";
          const statusConfig = getStatusConfig(book.status || "");
          return (
            <div
              key={book.id}
              style={{
                width: "100%", border: "1px solid var(--line)", background: "var(--paper-soft)",
                borderRadius: 24, padding: 12, display: "grid", gridTemplateColumns: "62px 1fr auto",
                gap: 13, alignItems: "center", boxShadow: "0 4px 16px rgba(44,33,27,0.07)",
              }}
            >
              <div style={{ position: "relative" }}>
                <img
                  src={book.cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=200&q=60"}
                  alt={book.title}
                  onClick={() => handleBookClick(book)}
                  style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 12, display: "block", cursor: "pointer" }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(book); }}
                  style={{
                    position: "absolute", top: 4, right: 4,
                    width: 22, height: 22, borderRadius: "50%",
                    border: 0, background: "rgba(255,255,255,0.92)",
                    color: isFav ? "#ef4444" : "rgba(0,0,0,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  }}
                  title={isFav ? "Убрать из избранного" : "В избранное"}
                >
                  <Heart size={11} fill={isFav ? "#ef4444" : "none"} strokeWidth={2} />
                </button>
              </div>

              <div onClick={() => handleBookClick(book)} style={{ cursor: "pointer", minWidth: 0 }}>
                <h3 style={{ margin: 0, color: "var(--ink)", fontWeight: 700, fontSize: 14, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {book.title}
                </h3>
                <p style={{ margin: "3px 0 6px", color: "var(--muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {book.author}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 11, color: statusConfig?.color || "var(--accent)",
                    background: statusConfig?.bgColor || "color-mix(in srgb, var(--accent-2), white 30%)",
                    padding: "3px 8px", borderRadius: 999,
                  }}>
                    {book.status}
                  </span>
                  {(book.rating || 0) > 0 && (
                    <span style={{ fontSize: 11, color: "var(--muted)", background: "rgba(0,0,0,0.05)", padding: "3px 8px", borderRadius: 999 }}>
                      {book.rating}/5 ★
                    </span>
                  )}
                </div>
                {(book.pages || 0) > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 6, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg, var(--accent), var(--accent-2))", width: `${Math.min(100, Math.round((book.read_pages || 0) / (book.pages || 1) * 100))}%` }} />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, display: "block" }}>
                      {book.read_pages || 0} / {book.pages} стр.
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDelete(book)}
                disabled={deleting}
                style={{ border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex" }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {searchModalOpen && (
        <BookSearchModal
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
        />
      )}

      {pendingDelete && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={() => setPendingDelete(null)}
        >
          <div
            style={{
              width: "100%", maxWidth: 480,
              background: "var(--paper)", borderRadius: "28px 28px 0 0",
              padding: "24px 20px 32px",
              boxShadow: "0 -8px 40px rgba(44,33,27,0.18)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(239,68,68,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px",
              }}>
                <Trash2 size={24} style={{ color: "#ef4444" }} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--ink)", marginBottom: 6 }}>
                Удалить книгу?
              </div>
              <div style={{
                fontSize: 13, color: "var(--muted)", lineHeight: 1.4,
                maxWidth: 260, margin: "0 auto",
              }}>
                «{pendingDelete.title}» будет удалена с полки без возможности восстановления
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={() => setPendingDelete(null)}
                style={{
                  border: "1.5px solid var(--line)",
                  borderRadius: 16, padding: "13px",
                  background: "transparent",
                  color: "var(--ink)", fontWeight: 700, fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  border: 0, borderRadius: 16, padding: "13px",
                  background: "#ef4444",
                  color: "white", fontWeight: 700, fontSize: 14,
                  cursor: deleting ? "default" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
