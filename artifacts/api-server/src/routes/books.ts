import { Router } from "express";
import { db, booksTable } from "@workspace/db";
import { and, eq, desc, sql } from "drizzle-orm";
import { SearchBooksQueryParams, SaveBookBody, DeleteBookParams } from "@workspace/api-zod";

const router = Router();

const CHAT_ROOMS = ["detective", "fantasy", "romance", "heartbreak", "academia", "recommendations"];

function normalizeGuestKey(value: unknown): string | null {
  return typeof value === "string" && value.trim().length >= 12
    ? value.trim().slice(0, 120)
    : null;
}

function getGuestKey(req: { headers: Record<string, unknown> }, bodyValue?: unknown): string | null {
  return normalizeGuestKey(bodyValue) || normalizeGuestKey(req.headers["x-guest-key"]);
}

async function searchGoogleBooks(q: string, limit: number) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${Math.min(limit, 20)}&printType=books`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as { items?: unknown[] };
    return (data.items || []).map((item: unknown) => {
      const i = item as Record<string, unknown>;
      const info = (i.volumeInfo || {}) as Record<string, unknown>;
      const identifiers = (info.industryIdentifiers || []) as Array<Record<string, string>>;
      const isbn = identifiers.find(e => e.type?.startsWith("ISBN"))?.identifier || "";
      const imageLinks = (info.imageLinks || {}) as Record<string, string>;
      return {
        external_id: i.id || "",
        source: "google_books",
        title: info.title || "Без названия",
        author: ((info.authors || []) as string[]).join(", "),
        description: info.description || "",
        cover: (imageLinks.thumbnail || imageLinks.smallThumbnail || "").replace("http://", "https://"),
        pages: info.pageCount || 0,
        isbn,
        genres: (info.categories || []) as string[],
      };
    });
  } catch {
    return [];
  }
}

async function searchOpenLibrary(q: string, limit: number) {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${Math.min(limit, 20)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as { docs?: unknown[] };
    return (data.docs || []).map((item: unknown) => {
      const i = item as Record<string, unknown>;
      const coverId = i.cover_i;
      return {
        external_id: i.key || "",
        source: "open_library",
        title: i.title || "Без названия",
        author: ((i.author_name || []) as string[]).slice(0, 3).join(", "),
        description: "",
        cover: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "",
        pages: (i.number_of_pages_median as number) || 0,
        isbn: ((i.isbn || []) as string[])[0] || "",
        genres: ((i.subject || []) as string[]).slice(0, 4),
      };
    });
  } catch {
    return [];
  }
}

function dedupeBooks(items: Array<Record<string, unknown>>) {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = ((item.isbn as string) || `${item.title}:${item.author}`).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

router.get("/books/search", async (req, res) => {
  const parsed = SearchBooksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { q, limit } = parsed.data;
  const [google, openLibrary] = await Promise.all([
    searchGoogleBooks(q, limit),
    searchOpenLibrary(q, limit),
  ]);
  const merged = dedupeBooks([...google, ...openLibrary]).slice(0, limit);
  const items = merged.length > 0 ? merged : [{
    external_id: `fallback:${q}`,
    source: "fallback",
    title: q,
    author: "Добавить автора вручную",
    description: "",
    cover: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=500&q=80",
    pages: 0,
    isbn: "",
    genres: ["ручное добавление"],
  }];
  res.json({ query: q, items });
});

router.get("/books", async (req: any, res) => {
  const userId = req.userId || 0;
  const guestKey = getGuestKey(req);
  const ownership = userId > 0
    ? eq(booksTable.userId, userId)
    : guestKey
      ? eq(booksTable.guestKey, guestKey)
      : eq(booksTable.userId, 0);
  const books = await db.select().from(booksTable).where(ownership).orderBy(desc(booksTable.createdAt));
  res.json({ items: books });
});

router.post("/books", async (req: any, res) => {
  const userId = req.userId || 0;
  const parsed = SaveBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const data = parsed.data;
  const guestKey = getGuestKey(req, data.guest_key);
  const ownerCondition = userId > 0
    ? eq(booksTable.userId, userId)
    : guestKey
      ? eq(booksTable.guestKey, guestKey)
      : eq(booksTable.userId, 0);
  
  // Check if book with this ID already exists
  const bookId = (req.body as any).id;
  if (bookId) {
    const existing = await db
      .select({ id: booksTable.id })
      .from(booksTable)
      .where(eq(booksTable.id, bookId))
      .limit(1);
    
    if (existing.length > 0) {
      // UPDATE existing book
      const [updated] = await db
        .update(booksTable)
        .set({
          title: data.title,
          author: data.author || "",
          description: data.description || "",
          cover: data.cover || "",
          pages: data.pages || 0,
          readPages: data.read_pages || 0,
          isbn: data.isbn || "",
          status: data.status,
          shelf: data.shelf,
          vibe: (data.vibe || []) as string[],
          rating: data.rating || 0,
        })
        .where(and(eq(booksTable.id, bookId), ownerCondition))
        .returning();
      res.json({ item: updated });
      return;
    }
  }
  
  // INSERT new book
  const [book] = await db.insert(booksTable).values({
    userId: userId > 0 ? userId : null,
    guestKey: userId > 0 ? null : guestKey,
    externalId: data.external_id || "",
    source: data.source || "manual",
    title: data.title,
    author: data.author || "",
    description: data.description || "",
    cover: data.cover || "",
    pages: data.pages || 0,
    readPages: data.read_pages || 0,
    isbn: data.isbn || "",
    status: data.status,
    shelf: data.shelf,
    vibe: (data.vibe || []) as string[],
    rating: data.rating || 0,
  }).returning();
  res.json({ item: book });
});

// Reset all reading statistics for the user (keeps books, zeroes progress)
router.post("/stats/reset", async (req: any, res) => {
  const userId = req.userId || 0;
  if (userId === 0) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  // Zero out read_pages for all user's books
  await db
    .update(booksTable)
    .set({ readPages: 0 })
    .where(eq(booksTable.userId, userId));
  res.json({ ok: true });
});

router.delete("/books/:bookId", async (req: any, res) => {
  const userId = req.userId || 0;
  const parsed = DeleteBookParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const { bookId } = parsed.data;
  const existing = await db
    .select({ id: booksTable.id })
    .from(booksTable)
    .where(userId > 0 
      ? (sql`${booksTable.id} = ${bookId} AND ${booksTable.userId} = ${userId}`)
      : (sql`${booksTable.id} = ${bookId}`)
    )
    .limit(1);
  if (!existing.length) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  await db.delete(booksTable).where(eq(booksTable.id, bookId));
  res.json({ deleted: true, id: bookId });
});

export default router;
