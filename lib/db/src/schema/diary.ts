import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { booksTable } from "./books";

export const diaryTable = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  bookId: integer("book_id").notNull().references(() => booksTable.id, { onDelete: "cascade" }),
  quote: text("quote").notNull().default(""),
  note: text("note").notNull().default(""),
  ratings: jsonb("ratings").$type<Record<string, number>>().notNull().default({}),
  music: jsonb("music").$type<Record<string, string>>().notNull().default({}),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  stickers: jsonb("stickers").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDiarySchema = createInsertSchema(diaryTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDiary = z.infer<typeof insertDiarySchema>;
export type DiaryEntry = typeof diaryTable.$inferSelect;
