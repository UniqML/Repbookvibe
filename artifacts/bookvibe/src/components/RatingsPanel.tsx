import { useState, useEffect } from "react";
import { Star, Trash2, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Rating {
  id: number;
  score: number;
  review?: string;
  createdAt: string;
  userId: number;
  userName: string;
  userAvatar?: string;
}

interface RatingsPanelProps {
  bookId: number;
  onRatingAdded?: () => void;
}

export function RatingsPanel({ bookId, onRatingAdded }: RatingsPanelProps) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [myRating, setMyRating] = useState<Rating | null>(null);
  const [loading, setLoading] = useState(true);
  const [newScore, setNewScore] = useState(0);
  const [newReview, setNewReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRatings();
  }, [bookId]);

  const loadRatings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ratings?bookId=${bookId}`);
      const data = await res.json();
      const allRatings = data.items || [];
      const userRating = user && allRatings.find((r: Rating) => r.userId === user.id);
      setMyRating(userRating || null);
      setRatings(allRatings.filter((r: Rating) => r.userId !== user?.id));
    } catch (error) {
      console.error("Failed to load ratings:", error);
    }
    setLoading(false);
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.isAnonymous || newScore === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("bookvibe_token")}`,
        },
        body: JSON.stringify({
          bookId,
          score: newScore,
          review: newReview || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMyRating(data);
        setNewScore(0);
        setNewReview("");
        onRatingAdded?.();
      }
    } catch (error) {
      console.error("Failed to submit rating:", error);
    }
    setSubmitting(false);
  };

  const handleDeleteRating = async (ratingId: number) => {
    if (!confirm("Удалить оценку?")) return;

    try {
      const res = await fetch(`/api/ratings/${ratingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("bookvibe_token")}`,
        },
      });
      if (res.ok) {
        if (myRating?.id === ratingId) {
          setMyRating(null);
        } else {
          setRatings(ratings.filter((r) => r.id !== ratingId));
        }
        onRatingAdded?.();
      }
    } catch (error) {
      console.error("Failed to delete rating:", error);
    }
  };

  const avgScore = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Stats */}
      {(myRating || ratings.length > 0) && (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
            background: "rgba(255,255,255,0.55)",
            borderRadius: 14,
            border: "1px solid var(--line)",
          }}>
            <div style={{ fontSize: 20 }}>⭐</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--accent)" }}>
                {avgScore}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {ratings.length} {ratings.length === 1 ? "оценка" : "оценок"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Rating */}
      {user && !user.isAnonymous && (
        <div style={{
          padding: 12,
          background: "rgba(255,255,255,0.55)",
          borderRadius: 14,
          border: "1px solid var(--line)",
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 10 }}>
            {myRating ? "Ваша оценка" : "Оценить книгу"}
          </div>
          <form onSubmit={handleSubmitRating} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Star Rating */}
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewScore(newScore === star ? 0 : star)}
                  style={{
                    border: 0,
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 24,
                    opacity: star <= (myRating?.score || newScore) ? 1 : 0.3,
                    transition: "opacity 0.15s",
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            {/* Review Text */}
            <textarea
              value={myRating?.review || newReview}
              onChange={(e) => setNewReview(e.target.value)}
              placeholder="Напишите отзыв (опционально)..."
              disabled={!!myRating && myRating.score !== newScore}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "8px 10px",
                background: "rgba(255,255,255,0.65)",
                color: "var(--ink)",
                fontSize: 12,
                fontFamily: "inherit",
                outline: "none",
                resize: "none",
                minHeight: "60px",
                maxHeight: "100px",
              }}
            />

            {/* Submit Button */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                disabled={submitting || (myRating?.score || 0) === 0}
                style={{
                  flex: 1,
                  border: 0,
                  borderRadius: 10,
                  padding: "10px",
                  background: (myRating?.score || 0) > 0 ? "var(--accent)" : "var(--line)",
                  color: (myRating?.score || 0) > 0 ? "white" : "var(--muted)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: (myRating?.score || 0) > 0 && !submitting ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <Send size={14} />
                {myRating ? "Обновить" : "Оценить"}
              </button>
              {myRating && (
                <button
                  type="button"
                  onClick={() => handleDeleteRating(myRating.id)}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "10px",
                    background: "transparent",
                    color: "var(--muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Удалить оценку"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Other Ratings */}
      {ratings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ratings.map((rating) => (
            <div
              key={rating.id}
              style={{
                padding: 12,
                background: "rgba(255,255,255,0.55)",
                borderRadius: 12,
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                  {rating.userAvatar ? (
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent), #1f1510 40%))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: 16,
                      flexShrink: 0,
                    }}>
                      {rating.userAvatar}
                    </div>
                  ) : (
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "var(--line)",
                      flexShrink: 0,
                    }} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>
                      {rating.userName}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>
                      {"★".repeat(rating.score)}{"☆".repeat(5 - rating.score)}
                    </div>
                  </div>
                </div>
              </div>
              {rating.review && (
                <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>
                  {rating.review}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
          Загружаю оценки...
        </div>
      )}
    </div>
  );
}
