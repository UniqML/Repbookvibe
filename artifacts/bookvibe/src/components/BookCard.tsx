import { Star, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BookCardProps {
  id?: string;
  title: string;
  author: string;
  cover?: string;
  rating?: number;
  reviewPreview?: string;
  genres?: string[];
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  onClick?: () => void;
}

export function BookCard({
  title,
  author,
  cover,
  rating = 0,
  reviewPreview,
  genres = [],
  isFavorite = false,
  onFavoriteToggle,
  onClick,
}: BookCardProps) {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star
            key={i}
            className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star
            key={i}
            className="w-3.5 h-3.5 fill-amber-400/50 text-amber-400"
          />
        );
      } else {
        stars.push(
          <Star
            key={i}
            className="w-3.5 h-3.5 text-[var(--line)]"
          />
        );
      }
    }
    return stars;
  };

  return (
    <article
      onClick={onClick}
      className="group relative flex gap-4 p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-[0_4px_20px_rgba(44,33,27,0.08)] cursor-pointer transition-all duration-200 hover:shadow-[0_8px_30px_rgba(44,33,27,0.12)] hover:translate-y-[-2px] active:scale-[0.98]"
    >
      {/* Book Cover */}
      <div className="relative flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
        <img
          src={cover || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=200&q=60"}
          alt={`Cover of ${title}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle?.();
          }}
          className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
            isFavorite
              ? "bg-[var(--accent)] text-white"
              : "bg-white/90 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
          }`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className="w-3.5 h-3.5" fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Book Details */}
      <div className="flex flex-col flex-1 min-w-0 py-0.5">
        <h3 className="font-bold text-[var(--ink)] text-sm leading-tight line-clamp-2 mb-1">
          {title}
        </h3>
        <p className="text-xs text-[var(--muted)] mb-2 truncate">{author}</p>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-0.5">
              {renderStars(rating)}
            </div>
            <span className="text-xs font-semibold text-[var(--muted)]">
              {rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Review Preview */}
        {reviewPreview && (
          <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2 mb-2 italic">
            &ldquo;{reviewPreview}&rdquo;
          </p>
        )}

        {/* Genre Tags */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {genres.slice(0, 3).map((genre) => (
              <Badge
                key={genre}
                variant="secondary"
                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-2)] text-[var(--ink)] border-0 font-medium"
              >
                {genre}
              </Badge>
            ))}
            {genres.length > 3 && (
              <Badge
                variant="secondary"
                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] border-0"
              >
                +{genres.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
