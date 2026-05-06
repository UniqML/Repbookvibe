import { useState } from "react";
import { Search, X, SlidersHorizontal, Clock, BookOpen, Heart } from "lucide-react";
import { BookCard } from "@/components/BookCard";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  title: string;
  author: string;
  cover?: string;
  rating?: number;
  genres?: string[];
  pages?: number;
  year?: number;
  reviewPreview?: string;
}

interface BookSearchProps {
  onSearch?: (query: string, filters: SearchFilters) => Promise<SearchResult[]>;
  onAddBook?: (book: SearchResult, status: "want" | "reading" | "favorite") => void;
  isLoading?: boolean;
}

interface SearchFilters {
  genre?: string;
  author?: string;
  yearFrom?: number;
  yearTo?: number;
}

const GENRES = [
  "Fiction",
  "Non-Fiction",
  "Mystery",
  "Romance",
  "Fantasy",
  "Sci-Fi",
  "Biography",
  "History",
  "Self-Help",
  "Poetry",
];

// Demo data for preview
const DEMO_RESULTS: SearchResult[] = [
  {
    id: "1",
    title: "The Midnight Library",
    author: "Matt Haig",
    cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=200&q=60",
    rating: 4.5,
    genres: ["Fiction", "Fantasy"],
    pages: 304,
    year: 2020,
    reviewPreview: "A beautiful story about second chances and the infinite possibilities of life.",
  },
  {
    id: "2",
    title: "Atomic Habits",
    author: "James Clear",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=200&q=60",
    rating: 4.8,
    genres: ["Self-Help", "Non-Fiction"],
    pages: 320,
    year: 2018,
    reviewPreview: "Practical strategies for forming good habits and breaking bad ones.",
  },
  {
    id: "3",
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=200&q=60",
    rating: 4.6,
    genres: ["Fiction", "Mystery"],
    pages: 384,
    year: 2018,
    reviewPreview: "A hauntingly beautiful tale of isolation, nature, and mystery.",
  },
];

export function BookSearch({ onSearch, onAddBook, isLoading = false }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !selectedGenre) return;

    setHasSearched(true);

    if (onSearch) {
      const searchResults = await onSearch(query, {
        ...filters,
        genre: selectedGenre || undefined,
      });
      setResults(searchResults);
    } else {
      // Demo mode - filter demo results
      const filtered = DEMO_RESULTS.filter((book) => {
        const matchesQuery =
          !query ||
          book.title.toLowerCase().includes(query.toLowerCase()) ||
          book.author.toLowerCase().includes(query.toLowerCase());
        const matchesGenre =
          !selectedGenre || book.genres?.includes(selectedGenre);
        return matchesQuery && matchesGenre;
      });
      setResults(filtered);
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setSelectedGenre(null);
  };

  const handleAddBook = (book: SearchResult, status: "want" | "reading" | "favorite") => {
    onAddBook?.(book, status);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--paper)]">
      {/* Search Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 bg-[var(--paper)] border-b border-[var(--line)]">
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl border border-[var(--line)] bg-white/60 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20 transition-all">
            <Search className="w-4 h-4 text-[var(--muted)] flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or author..."
              className="flex-1 bg-transparent text-[var(--ink)] text-sm placeholder:text-[var(--muted)] outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 rounded-full hover:bg-[var(--line)] transition-colors"
              >
                <X className="w-3.5 h-3.5 text-[var(--muted)]" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-3 rounded-2xl bg-[var(--accent)] text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-[var(--accent)]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "..." : "Search"}
          </button>
        </form>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            showFilters || selectedGenre
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--paper-soft)] text-[var(--muted)] hover:bg-[var(--line)]"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {selectedGenre && (
            <Badge className="ml-1 px-1.5 py-0 text-[10px] bg-white/20 text-white border-0">
              1
            </Badge>
          )}
        </button>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-3 p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--ink)]">Genre</h3>
              {selectedGenre && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-[var(--accent)] font-medium hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() =>
                    setSelectedGenre(selectedGenre === genre ? null : genre)
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedGenre === genre
                      ? "bg-[var(--accent)] text-white"
                      : "bg-white/60 text-[var(--muted)] border border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Year Range */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-[var(--ink)] mb-2">Year Range</h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  placeholder="From"
                  value={filters.yearFrom || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, yearFrom: parseInt(e.target.value) || undefined })
                  }
                  className="w-24 px-3 py-2 rounded-xl border border-[var(--line)] bg-white/60 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[var(--muted)]">to</span>
                <input
                  type="number"
                  placeholder="To"
                  value={filters.yearTo || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, yearTo: parseInt(e.target.value) || undefined })
                  }
                  className="w-24 px-3 py-2 rounded-xl border border-[var(--line)] bg-white/60 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-full bg-[var(--accent-2)] flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--ink)] mb-2">
              Discover Your Next Read
            </h3>
            <p className="text-sm text-[var(--muted)]">
              Search for books by title, author, or browse by genre
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-lg font-bold text-[var(--ink)] mb-2">No books found</h3>
            <p className="text-sm text-[var(--muted)]">
              Try a different search term or adjust your filters
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[var(--muted)] mb-2">
              {results.length} {results.length === 1 ? "result" : "results"} found
            </p>
            {results.map((book) => (
              <div key={book.id} className="relative">
                <BookCard
                  title={book.title}
                  author={book.author}
                  cover={book.cover}
                  rating={book.rating}
                  genres={book.genres}
                  reviewPreview={book.reviewPreview}
                />
                {/* Action Buttons */}
                <div className="flex gap-2 mt-2 ml-24">
                  <button
                    onClick={() => handleAddBook(book, "want")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] text-[var(--muted)] text-xs font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Later
                  </button>
                  <button
                    onClick={() => handleAddBook(book, "reading")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:shadow-md hover:shadow-[var(--accent)]/30 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Read
                  </button>
                  <button
                    onClick={() => handleAddBook(book, "favorite")}
                    className="flex items-center justify-center w-8 h-8 rounded-xl border border-[var(--line)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-all"
                    aria-label="Add to favorites"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
