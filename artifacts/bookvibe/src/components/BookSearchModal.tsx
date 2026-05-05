import { useState } from "react";
import { Search, X, Heart, BookOpen, Clock } from "lucide-react";
import { useSaveBook, useListBooks, getListBooksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Book } from "@workspace/api-client-react";

interface SearchResult {
  external_id: string;
  source: string;
  title: string;
  author: string;
  description?: string;
  cover?: string;
  pages?: number;
  isbn?: string;
  genres?: string[];
}

interface BookSearchModalProps {
  open: boolean;
  onClose: () => void;
}

function getBookStatus(books: Book[], result: SearchResult): Book | undefined {
  return books.find(
    b => (result.external_id && b.external_id === result.external_id) ||
         b.title.toLowerCase() === result.title.toLowerCase()
  );
}

export function BookSearchModal({ open, onClose }: BookSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { mutateAsync: saveBook } = useSaveBook();
  const { data: booksData } = useListBooks();
  const existingBooks: Book[] = booksData?.items || [];
  const qc = useQueryClient();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/books/search?q=${encodeURIComponent(query.trim())}&limit=10`
      );
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      setResults(data.items || []);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    }
    setLoading(false);
  };

  const handleAddBook = async (result: SearchResult, status: "Хочу прочитать" | "Читаю", shelf: string) => {
    const key = `${result.source}-${result.external_id}-${status}-${shelf}`;
    setBusy(key);
    try {
      await saveBook({
        data: {
          external_id: result.external_id,
          source: result.source,
          title: result.title,
          author: result.author,
          description: result.description || "",
          cover: result.cover || "",
          pages: result.pages || 0,
          isbn: result.isbn || "",
          status,
          shelf,
          vibe: result.genres || [],
          rating: 0,
        },
      });
      qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
    } catch (error) {
      console.error("Failed to add book:", error);
    } finally {
      setBusy(null);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 40,
          backdropFilter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          background: "var(--paper)",
          borderRadius: "28px 28px 0 0",
          padding: "0 0 40px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.22)",
          maxHeight: "88%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 22px 14px",
          }}
        >
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: "var(--ink)" }}>
            Найти книгу
          </h2>
          <button
            onClick={onClose}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "50%",
              width: 36,
              height: 36,
              background: "var(--paper-soft)",
              color: "var(--muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <form
            onSubmit={handleSearch}
            style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid var(--line)",
                background: "rgba(255,255,255,0.62)",
                borderRadius: 18,
                padding: "10px 14px",
              }}
            >
              <Search size={16} style={{ color: "var(--muted)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Название или автор..."
                style={{
                  flex: 1, border: 0, outline: 0,
                  background: "transparent", color: "var(--ink)",
                  fontSize: 14, fontFamily: "inherit",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                border: 0, borderRadius: 12, padding: "10px 16px",
                background: query.trim() ? "var(--accent)" : "var(--line)",
                color: query.trim() ? "white" : "var(--muted)",
                fontWeight: 700, fontSize: 14,
                cursor: query.trim() && !loading ? "pointer" : "default",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "..." : "Поиск"}
            </button>
          </form>

          {results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "420px", overflowY: "auto" }}>
              {results.map((result) => {
                const existing = getBookStatus(existingBooks, result);
                const isReading = existing?.status === "Читаю";
                const isFav = existing?.shelf === "Любимые";
                const isWant = existing && existing.status === "Хочу прочитать" && existing.shelf !== "Любимые";
                const busyWant = busy === `${result.source}-${result.external_id}-Хочу прочитать-Новые`;
                const busyRead = busy === `${result.source}-${result.external_id}-Читаю-Новые`;
                const busyFav = busy === `${result.source}-${result.external_id}-Хочу прочитать-Любимые`;

                return (
                  <div
                    key={result.external_id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60px 1fr",
                      gap: 12,
                      padding: 12,
                      background: existing ? "color-mix(in srgb, var(--accent), white 93%)" : "rgba(255,255,255,0.55)",
                      borderRadius: 16,
                      border: existing ? "1px solid color-mix(in srgb, var(--accent), white 70%)" : "1px solid var(--line)",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <img
                        src={result.cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=200&q=60"}
                        alt={result.title}
                        style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 10, display: "block" }}
                      />
                      <button
                        onClick={() => handleAddBook(result, "Хочу прочитать", "Любимые")}
                        disabled={!!busy}
                        title="В любимые"
                        style={{
                          position: "absolute", top: 4, right: 4,
                          width: 24, height: 24, borderRadius: "50%",
                          border: 0,
                          background: isFav ? "var(--accent)" : "rgba(255,255,255,0.85)",
                          color: isFav ? "white" : "var(--accent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: busy ? "default" : "pointer",
                          boxShadow: "0 1px 6px rgba(0,0,0,0.2)",
                          padding: 0,
                          opacity: busyFav ? 0.5 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        <Heart size={12} fill={isFav ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13, lineHeight: 1.3 }}>
                        {result.title}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{result.author}</div>
                      {result.pages && (
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{result.pages} стр.</div>
                      )}
                      {existing && (
                        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginBottom: 2 }}>
                          {existing.status === "Читаю" ? "📖 Читаю" : existing.shelf === "Любимые" ? "❤️ В любимых" : "🕐 Прочту позже"}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                        <button
                          onClick={() => handleAddBook(result, "Хочу прочитать", "Новые")}
                          disabled={!!busy}
                          title="Прочту позже"
                          style={{
                            border: isWant ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                            borderRadius: 10, padding: "6px 10px",
                            background: isWant ? "color-mix(in srgb, var(--accent), white 80%)" : "transparent",
                            color: isWant ? "var(--accent)" : "var(--muted)",
                            cursor: busy ? "default" : "pointer",
                            fontSize: 11, fontWeight: 700, opacity: busyWant ? 0.6 : 1,
                            display: "flex", alignItems: "center", gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          <Clock size={12} />
                          Позже
                        </button>
                        <button
                          onClick={() => handleAddBook(result, "Читаю", "Новые")}
                          disabled={!!busy}
                          title="Начать читать"
                          style={{
                            border: 0, borderRadius: 10, padding: "6px 12px",
                            background: isReading ? "var(--accent)" : "color-mix(in srgb, var(--accent), white 15%)",
                            color: "white",
                            cursor: busy ? "default" : "pointer",
                            fontSize: 11, fontWeight: 700, opacity: busyRead ? 0.6 : 1,
                            display: "flex", alignItems: "center", gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          <BookOpen size={12} />
                          {isReading ? "Читаю" : "Читать"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 14 }}>Книги не найдены</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Попробуйте другой запрос</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
