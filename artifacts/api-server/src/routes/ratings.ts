import { Router } from "express";
import { db, ratingsTable, usersTable, booksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Get ratings for a book (public)
router.get("/ratings", async (req: any, res) => {
  const { bookId } = req.query;
  if (!bookId) {
    res.status(400).json({ error: "bookId required" });
    return;
  }

  const ratings = await db
    .select({
      id: ratingsTable.id,
      score: ratingsTable.score,
      review: ratingsTable.review,
      createdAt: ratingsTable.createdAt,
      userId: ratingsTable.userId,
      userName: usersTable.displayName,
      userAvatar: usersTable.avatarUrl,
    })
    .from(ratingsTable)
    .innerJoin(usersTable, eq(ratingsTable.userId, usersTable.id))
    .where(eq(ratingsTable.bookId, parseInt(bookId)))
    .orderBy(ratingsTable.createdAt);

  res.json({ items: ratings });
});

// Post a rating for a book (authenticated)
router.post("/ratings", async (req: any, res) => {
  const userId = req.userId;
  if (!userId || userId === 0) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { bookId, score, review } = req.body;
  if (!bookId || !score) {
    res.status(400).json({ error: "bookId and score required" });
    return;
  }

  if (score < 1 || score > 5) {
    res.status(400).json({ error: "score must be 1-5" });
    return;
  }

  // Check if book exists
  const [book] = await db
    .select({ id: booksTable.id })
    .from(booksTable)
    .where(eq(booksTable.id, bookId));

  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  // Delete old rating if exists
  await db
    .delete(ratingsTable)
    .where(
      eq(ratingsTable.userId, userId) && 
      eq(ratingsTable.bookId, bookId)
    );

  // Insert new rating
  const [newRating] = await db
    .insert(ratingsTable)
    .values({
      userId,
      bookId,
      score,
      review: review || null,
    })
    .returning();

  const [user] = await db
    .select({
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  res.json({
    id: newRating.id,
    score: newRating.score,
    review: newRating.review,
    createdAt: newRating.createdAt,
    userId: newRating.userId,
    userName: user.displayName,
    userAvatar: user.avatarUrl,
  });
});

// Delete a rating (authenticated)
router.delete("/ratings/:ratingId", async (req: any, res) => {
  const userId = req.userId;
  if (!userId || userId === 0) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { ratingId } = req.params;
  const [rating] = await db
    .select({ userId: ratingsTable.userId })
    .from(ratingsTable)
    .where(eq(ratingsTable.id, parseInt(ratingId)));

  if (!rating) {
    res.status(404).json({ error: "Rating not found" });
    return;
  }

  if (rating.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(ratingsTable).where(eq(ratingsTable.id, parseInt(ratingId)));
  res.json({ deleted: true });
});

export default router;
