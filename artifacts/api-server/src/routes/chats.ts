import { Router } from "express";
import { db, chatMessagesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { ListChatMessagesQueryParams, SendChatMessageParams, SendChatMessageBody } from "@workspace/api-zod";

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
  if (!body.text?.trim() && !body.sticker?.trim() && !body.image_url?.trim()) {
    res.status(422).json({ error: "Message must contain text, sticker, or image" });
    return;
  }
  const [msg] = await db.insert(chatMessagesTable).values({
    roomId,
    author: body.author?.trim() || "Reader",
    text: body.text?.trim() || "",
    replyTo: body.reply_to ?? null,
    sticker: body.sticker?.trim() || "",
    imageUrl: body.image_url?.trim() || "",
  }).returning();
  res.json({ item: msg });
});

export default router;
