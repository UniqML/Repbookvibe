import { useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { useSaveBook, getListBooksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

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

export function BookSearchModal({ open, onClose }: BookSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"Хочу прочитать" | "Читаю" | "Прочитано">("Хочу прочитать");

  const { mutateAsync: saveBook, isPending: saving } = useSaveBook();
  const qc = useQueryClient();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSelected(null);
    try {
      const res = await fetch(
        `/api/books/search?q=${encodeURIComponent(query.trim())}&limit=10`
      );
      const data = await res.json();
      setResults(data.items || []);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    }
    setLoading(false);
  };

  const handleAddBook = async (result: SearchResult) => {
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
          shelf: "Моя библиотека",
          vibe: result.genres || [],
          rating: 0,
        },
      });
      qc.invalidateQueries({ queryKey: getListBooksQueryKey() });
      setResults([]);
      setQuery("");
      onClose();
    } catch (error) {
      console.error("Failed to add book:", error);
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
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
            }}
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
                  flex: 1,
                  border: 0,
                  outline: 0,
                  background: "transparent",
                  color: "var(--ink)",
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                border: 0,
                borderRadius: 12,
                padding: "10px 16px",
                background: query.trim() ? "var(--accent)" : "var(--line)",
                color: query.trim() ? "white" : "var(--muted)",
                fontWeight: 700,
                fontSize: 14,
                cursor: query.trim() && !loading ? "pointer" : "default",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "..." : "Поиск"}
            </button>
          </form>

          {results.length > 0 && (
            <>
              <div style={{ display: "flex", gap: 8, padding: "0 4px" }}>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.65)",
                    color: "var(--ink)",
                    fontSize: 13,
                    fontFamily: "inherit",
                    fontWeight: 600,
                  }}
                >
                  <option value="Хочу прочитать">Хочу прочитать</option>
                  <option value="Читаю">Читаю</option>
                  <option value="Прочитано">Прочитано</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  maxHeight: "400px",
                  overflowY: "auto",
                }}
              >
                {results.map((result) => (
                  <div
                    key={result.external_id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "64px 1fr auto",
                      gap: 12,
                      padding: 12,
                      background: "rgba(255,255,255,0.55)",
                      borderRadius: 16,
                      border: "1px solid var(--line)",
                    }}
                  >
                    <img
                      src={
                        result.cover ||
                        "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=200&q=60"
                      }
                      alt={result.title}
                      style={{
                        width: "100%",
                        aspectRatio: "2/3",
                        objectFit: "cover",
                        borderRadius: 10,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13, marginBottom: 4 }}>
                        {result.title}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 6 }}>
                        {result.author}
                      </div>
                      {result.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            lineHeight: 1.4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                          }}
                        >
                          {result.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddBook(result)}
                      disabled={saving}
                      style={{
                        border: 0,
                        borderRadius: 12,
                        padding: "8px 10px",
                        background: "var(--accent)",
                        color: "white",
                        cursor: saving ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontWeight: 700,
                        opacity: saving ? 0.7 : 1,
                      }}
                      title="Добавить в библиотеку"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && query && results.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--muted)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 14 }}>Книги не найдены</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Попробуйте другой запрос
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
