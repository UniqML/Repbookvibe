import { Router } from "express";
import { db, chatMessagesTable, moderationLogsTable, reportsTable, usersTable } from "@workspace/db";
import { and, eq, desc, sql } from "drizzle-orm";
import { ListChatMessagesQueryParams, SendChatMessageParams, SendChatMessageBody } from "@workspace/api-zod";
import { moderateChatText } from "../lib/moderation";

const router = Router();

const CHAT_ROOMS = [
  { id: "detective", name: "Детективы", description: "Расследования, триллеры и теории без спойлеров" },
  { id: "fantasy", name: "Фэнтези", description: "Драконы, магия, академии и миры" },
  { id: "romance", name: "Романтика", description: "Slow burn, chemistry, book boyfriend" },
  { id: "heartbreak", name: "Стекло", description: "Книги, которые разбивают сердце" },
  { id: "academia", name: "Dark academia", description: "Тайны, кампусы, осень и эстетика" },
  { id: "recommendations", name: "Рекомендации", description: "Что почитать, если понравилось..." },
];

const ROOM_IDS = new Set(CHAT_ROOMS.map(r => r.id));

type AuthRequest = { userId?: number };

async function ensureWelcomeMessages() {
  for (const room of CHAT_ROOMS) {
    const existing = await db.select({ id: chatMessagesTable.id })
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.roomId, room.id))
      .limit(1);
    if (!existing.length) {
      await db.insert(chatMessagesTable).values({
        roomId: room.id,
        author: "BookVibe",
        authorAvatarSeed: "bookvibe-official",
        text: `Добро пожаловать в чат «${room.name}». Делитесь рекомендациями без спойлеров.`,
        sticker: "",
        imageUrl: "",
      });
    }
  }
}

let seeded = false;

router.get("/chats/rooms", async (req, res) => {
  if (!seeded) { await ensureWelcomeMessages(); seeded = true; }
  const rooms = await Promise.all(CHAT_ROOMS.map(async room => {
    const [countRow] = await db.select({ total: sql<number>`count(*)::int` })
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.roomId, room.id));
    const [lastMsg] = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.roomId, room.id))
      .orderBy(desc(chatMessagesTable.id))
      .limit(1);
    return {
      ...room,
      messages: countRow?.total || 0,
      last_message: lastMsg || null,
    };
  }));
  res.json({ items: rooms });
});

router.get("/chats/:roomId/messages", async (req, res) => {
  const paramsParsed = SendChatMessageParams.safeParse(req.params);
  if (!paramsParsed.success || !ROOM_IDS.has(paramsParsed.data.roomId)) {
    res.status(404).json({ error: "Chat room not found" });
    return;
  }
  const queryParsed = ListChatMessagesQueryParams.safeParse(req.query);
  const limit = queryParsed.success ? queryParsed.data.limit : 40;

  const subquery = db.select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.roomId, paramsParsed.data.roomId))
    .orderBy(desc(chatMessagesTable.id))
    .limit(limit)
    .as("sub");

  const messages = await db.select().from(subquery).orderBy(subquery.id);
  res.json({ items: messages });
});

router.post("/chats/:roomId/messages", async (req, res) => {
  const paramsParsed = SendChatMessageParams.safeParse(req.params);
  if (!paramsParsed.success || !ROOM_IDS.has(paramsParsed.data.roomId)) {
    res.status(404).json({ error: "Chat room not found" });
    return;
  }
  const bodyParsed = SendChatMessageBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { roomId } = paramsParsed.data;
  const body = bodyParsed.data;
  let avatarSeed = body.author_avatar_seed?.trim() || body.author?.trim() || "Reader";
  const userId = (req as AuthRequest).userId;
  if (userId && userId > 0) {
    const [user] = await db
      .select({ avatarSeed: usersTable.avatarSeed, email: usersTable.email, displayName: usersTable.displayName })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    avatarSeed = user?.avatarSeed || user?.email || user?.displayName || avatarSeed;
  }
  if (!body.text?.trim() && !body.sticker?.trim() && !body.image_url?.trim()) {
    res.status(422).json({ error: "Message must contain text, sticker, or image" });
    return;
  }
  const moderation = moderateChatText(body.text?.trim() || "");
  if (moderation.flagged) {
    await db.insert(moderationLogsTable).values({
      userId: userId && userId > 0 ? userId : null,
      roomId,
      messageText: moderation.originalText,
      sanitizedText: moderation.action === "replace" ? moderation.text : null,
      violationType: moderation.violationType,
      matchedTerms: moderation.matchedTerms.join(","),
      action: moderation.action,
    });
    if (moderation.action === "block") {
      res.status(422).json({ error: "Message blocked by moderation" });
      return;
    }
  }
  const [msg] = await db.insert(chatMessagesTable).values({
    roomId,
    author: body.author?.trim() || "Reader",
    authorAvatarSeed: avatarSeed,
    text: moderation.text,
    replyTo: body.reply_to ?? null,
    sticker: body.sticker?.trim() || "",
    imageUrl: body.image_url?.trim() || "",
  }).returning();
  res.json({ item: msg });
});

router.post("/chats/:roomId/messages/:messageId/report", async (req, res) => {
  const paramsParsed = SendChatMessageParams.safeParse(req.params);
  if (!paramsParsed.success || !ROOM_IDS.has(paramsParsed.data.roomId)) {
    res.status(404).json({ error: "Chat room not found" });
    return;
  }
  const messageId = Number(req.params.messageId);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    res.status(400).json({ error: "Invalid message id" });
    return;
  }
  const { roomId } = paramsParsed.data;
  const [message] = await db
    .select({ id: chatMessagesTable.id })
    .from(chatMessagesTable)
    .where(and(eq(chatMessagesTable.id, messageId), eq(chatMessagesTable.roomId, roomId)))
    .limit(1);
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  const reason = typeof req.body?.reason === "string" && req.body.reason.trim()
    ? req.body.reason.trim().slice(0, 200)
    : "inappropriate";
  const userId = (req as AuthRequest).userId;
  const [report] = await db.insert(reportsTable).values({
    messageId,
    roomId,
    reporterUserId: userId && userId > 0 ? userId : null,
    reason,
  }).returning();
  res.json({ item: report });
});

export default router;
