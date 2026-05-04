import { Router } from "express";
import { db, usersTable, chatMessagesTable, moderationLogsTable } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";
import jwt from "jsonwebtoken";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "bookvibe-admin-secret-2024";
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const ADMIN_JWT_SECRET = `${JWT_SECRET}-admin`;

function verifyAdminToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as any;
    if (!decoded.isAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid admin token" });
  }
}

// Admin login — no verifyToken middleware needed here
router.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid admin password" });
    return;
  }
  const token = jwt.sign({ isAdmin: true }, ADMIN_JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
});

// All routes below require admin auth
router.use("/admin", verifyAdminToken);

// List all users
router.get("/admin/users", async (_req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      isVerified: usersTable.isVerified,
      isBanned: usersTable.isBanned,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(asc(usersTable.createdAt));
  res.json({ items: users });
});

// Ban / unban a user
router.post("/admin/users/:id/ban", async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const { banned } = req.body;
  const isBanned = banned === true || banned === "true";
  await db.update(usersTable).set({ isBanned }).where(eq(usersTable.id, userId));
  res.json({ ok: true, userId, isBanned });
});

// List messages in a room
router.get("/admin/chats/:roomId/messages", async (req, res) => {
  const { roomId } = req.params;
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.roomId, roomId))
    .orderBy(desc(chatMessagesTable.id))
    .limit(100);
  res.json({ items: messages });
});

// Delete a single message
router.delete("/admin/messages/:id", async (req, res) => {
  const messageId = Number(req.params.id);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    res.status(400).json({ error: "Invalid message id" });
    return;
  }
  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, messageId));
  res.json({ ok: true, deleted: messageId });
});

// Clear an entire room
router.delete("/admin/chats/:roomId", async (req, res) => {
  const { roomId } = req.params;
  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.roomId, roomId));
  res.json({ ok: true, roomId });
});

// Moderation logs
router.get("/admin/moderation-logs", async (_req, res) => {
  const logs = await db
    .select()
    .from(moderationLogsTable)
    .orderBy(desc(moderationLogsTable.createdAt))
    .limit(200);
  res.json({ items: logs });
});

export default router;
