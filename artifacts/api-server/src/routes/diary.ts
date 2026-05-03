import { Router } from "express";
import { db, diaryTable, booksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SaveDiaryEntryBody } from "@workspace/api-zod";

const router = Router();

router.get("/diary", async (req: any, res) => {
  const userId = req.userId || 0;
  const query = userId > 0
    ? db.select().from(diaryTable).where(eq(diaryTable.userId, userId))
    : db.select().from(diaryTable).where(eq(diaryTable.userId, 0));
  const entries = await query.orderBy(desc(diaryTable.updatedAt));
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
  const book = await db
    .select({ id: booksTable.id })
    .from(booksTable)
    .where(eq(booksTable.id, data.book_id))
    .limit(1);
  if (!book.length) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
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
  res.json({ item: entry });
});

export default router;
