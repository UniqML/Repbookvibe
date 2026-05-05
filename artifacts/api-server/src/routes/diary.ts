import { Router } from "express";
import { db, diaryTable, booksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SaveDiaryEntryBody } from "@workspace/api-zod";

const router = Router();

router.get("/diary", async (req: any, res) => {
  const userId = req.userId || 0;
  const entries = await db
    .select({
      id: diaryTable.id,
      user_id: diaryTable.userId,
      book_id: diaryTable.bookId,
      quote: diaryTable.quote,
      note: diaryTable.note,
      ratings: diaryTable.ratings,
      music: diaryTable.music,
      images: diaryTable.images,
      stickers: diaryTable.stickers,
      created_at: diaryTable.createdAt,
      updated_at: diaryTable.updatedAt,
      book_title: booksTable.title,
      book_cover: booksTable.cover,
      book_author: booksTable.author,
    })
    .from(diaryTable)
    .leftJoin(booksTable, eq(diaryTable.bookId, booksTable.id))
    .where(userId > 0 ? eq(diaryTable.userId, userId) : eq(diaryTable.userId, 0))
    .orderBy(desc(diaryTable.updatedAt));
  res.json({ items: entries });
});

router.post("/diary", async (req: any, res) => {
  const userId = req.userId || 0;
  const parsed = SaveDiaryEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = parsed.data;
  const bookRows = await db
    .select({ id: booksTable.id, title: booksTable.title, cover: booksTable.cover, author: booksTable.author })
    .from(booksTable)
    .where(eq(booksTable.id, data.book_id))
    .limit(1);
  if (!bookRows.length) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  const bookData = bookRows[0];
  const [entry] = await db
    .insert(diaryTable)
    .values({
      userId,
      bookId: data.book_id,
      quote: data.quote || "",
      note: data.note || "",
      ratings: (data.ratings || {}) as Record<string, number>,
      music: (data.music || {}) as Record<string, string>,
      images: (data.images || []) as string[],
      stickers: (data.stickers || []) as string[],
    })
    .returning();
  res.json({
    item: {
      id: entry.id,
      user_id: entry.userId,
      book_id: entry.bookId,
      quote: entry.quote,
      note: entry.note,
      ratings: entry.ratings,
      music: entry.music,
      images: entry.images,
      stickers: entry.stickers,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      book_title: bookData.title,
      book_cover: bookData.cover,
      book_author: bookData.author,
    },
  });
});

export default router;
