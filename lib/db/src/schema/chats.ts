import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  author: text("author").notNull().default("Reader"),
  authorAvatarSeed: text("author_avatar_seed"),
  authorUserId: integer("author_user_id"),
  text: text("text").notNull().default(""),
  replyTo: integer("reply_to"),
  sticker: text("sticker").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const moderationLogsTable = pgTable("moderation_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  roomId: text("room_id").notNull(),
  messageText: text("message_text").notNull(),
  sanitizedText: text("sanitized_text"),
  violationType: text("violation_type").notNull(),
  matchedTerms: text("matched_terms").notNull().default(""),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  roomId: text("room_id").notNull(),
  reporterUserId: integer("reporter_user_id"),
  reason: text("reason").notNull().default("inappropriate"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessagesTable).omit({ id: true, createdAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type ModerationLog = typeof moderationLogsTable.$inferSelect;
export type Report = typeof reportsTable.$inferSelect;
