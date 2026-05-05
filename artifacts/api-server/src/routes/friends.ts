import { Router, type Request, type Response } from "express";
import { db, usersTable, friendshipsTable, booksTable } from "@workspace/db";
import { eq, and, or, ilike } from "drizzle-orm";

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
}

function isOnline(lastSeenAt: Date | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - lastSeenAt.getTime() < 2 * 60 * 1000;
}

router.get("/users/search", async (req: AuthRequest, res: Response) => {
  const userId = req.userId || 0;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const q = String(req.query.q || "").trim();
  if (!q || q.length < 2) {
    res.json({ items: [] });
    return;
  }
  try {
    const users = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        avatarSeed: usersTable.avatarSeed,
        statusText: usersTable.statusText,
        lastSeenAt: usersTable.lastSeenAt,
      })
      .from(usersTable)
      .where(ilike(usersTable.displayName, `%${q}%`))
      .limit(20);

    const filtered = users.filter(u => u.id !== userId);
    res.json({ items: filtered.map(u => ({ ...u, isOnline: isOnline(u.lastSeenAt) })) });
  } catch {
    res.status(500).json({ error: "Search failed" });
  }
});

router.get("/users/:id", async (req: AuthRequest, res: Response) => {
  const targetId = parseInt(String(req.params.id), 10);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        avatarSeed: usersTable.avatarSeed,
        statusText: usersTable.statusText,
        lastSeenAt: usersTable.lastSeenAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, targetId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const books = await db
      .select({ status: booksTable.status, readPages: booksTable.readPages })
      .from(booksTable)
      .where(eq(booksTable.userId, targetId));

    const finishedCount = books.filter(b => b.status === "Прочитано").length;
    const totalPages = books.reduce((s, b) => s + (b.readPages || 0), 0);

    res.json({
      ...user,
      isOnline: isOnline(user.lastSeenAt),
      finishedBooks: finishedCount,
      totalPages,
    });
  } catch {
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.get("/friends", async (req: AuthRequest, res: Response) => {
  const userId = req.userId || 0;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await db
      .select({
        id: friendshipsTable.id,
        status: friendshipsTable.status,
        userId: friendshipsTable.userId,
        friendId: friendshipsTable.friendId,
        createdAt: friendshipsTable.createdAt,
      })
      .from(friendshipsTable)
      .where(
        or(
          eq(friendshipsTable.userId, userId),
          eq(friendshipsTable.friendId, userId)
        )
      );

    const otherIds = rows.map(r => (r.userId === userId ? r.friendId : r.userId));
    const uniqueIds = [...new Set(otherIds)];

    let userMap: Record<number, { id: number; displayName: string; avatarSeed: string | null; statusText: string | null; lastSeenAt: Date | null }> = {};
    if (uniqueIds.length > 0) {
      const users = await db
        .select({
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarSeed: usersTable.avatarSeed,
          statusText: usersTable.statusText,
          lastSeenAt: usersTable.lastSeenAt,
        })
        .from(usersTable);
      for (const u of users) {
        if (uniqueIds.includes(u.id)) userMap[u.id] = u;
      }
    }

    const friends = rows
      .filter(r => r.status === "accepted")
      .map(r => {
        const otherId = r.userId === userId ? r.friendId : r.userId;
        const u = userMap[otherId];
        return {
          friendshipId: r.id,
          ...u,
          isOnline: isOnline(u?.lastSeenAt),
        };
      });

    const incoming = rows
      .filter(r => r.status === "pending" && r.friendId === userId)
      .map(r => {
        const u = userMap[r.userId];
        return { friendshipId: r.id, ...u, isOnline: isOnline(u?.lastSeenAt) };
      });

    const outgoing = rows
      .filter(r => r.status === "pending" && r.userId === userId)
      .map(r => {
        const u = userMap[r.friendId];
        return { friendshipId: r.id, ...u, isOnline: isOnline(u?.lastSeenAt) };
      });

    res.json({ friends, incoming, outgoing });
  } catch {
    res.status(500).json({ error: "Failed to get friends" });
  }
});

router.post("/friends/request", async (req: AuthRequest, res: Response) => {
  const userId = req.userId || 0;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { friendId } = req.body;
  if (!friendId || friendId === userId) {
    res.status(400).json({ error: "Invalid friendId" });
    return;
  }
  try {
    const existing = await db
      .select()
      .from(friendshipsTable)
      .where(
        or(
          and(eq(friendshipsTable.userId, userId), eq(friendshipsTable.friendId, friendId)),
          and(eq(friendshipsTable.userId, friendId), eq(friendshipsTable.friendId, userId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Request already exists", friendship: existing[0] });
      return;
    }

    const [row] = await db
      .insert(friendshipsTable)
      .values({ userId, friendId, status: "pending" })
      .returning();

    res.status(201).json({ friendship: row });
  } catch {
    res.status(500).json({ error: "Failed to send request" });
  }
});

router.post("/friends/accept/:id", async (req: AuthRequest, res: Response) => {
  const userId = req.userId || 0;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  try {
    const [row] = await db
      .update(friendshipsTable)
      .set({ status: "accepted" })
      .where(and(eq(friendshipsTable.id, id), eq(friendshipsTable.friendId, userId)))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.json({ friendship: row });
  } catch {
    res.status(500).json({ error: "Failed to accept" });
  }
});

router.delete("/friends/:id", async (req: AuthRequest, res: Response) => {
  const userId = req.userId || 0;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(String(req.params.id), 10);
  try {
    await db
      .delete(friendshipsTable)
      .where(
        and(
          eq(friendshipsTable.id, id),
          or(
            eq(friendshipsTable.userId, userId),
            eq(friendshipsTable.friendId, userId)
          )
        )
      );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

export default router;
