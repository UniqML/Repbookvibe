import { pgTable, serial, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const booksTable = pgTable("saved_books", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  guestKey: text("guest_key"),
  externalId: text("external_id").notNull().default(""),
  source: text("source").notNull().default("manual"),
  title: text("title").notNull(),
  author: text("author").notNull().default(""),
  description: text("description").notNull().default(""),
  cover: text("cover").notNull().default(""),
  pages: integer("pages").notNull().default(0),
  readPages: integer("read_pages").notNull().default(0),
  isbn: text("isbn").notNull().default(""),
  status: text("status").notNull().default("Хочу прочитать"),
  shelf: text("shelf").notNull().default("Новые"),
  vibe: jsonb("vibe").$type<string[]>().notNull().default([]),
  rating: real("rating").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookSchema = createInsertSchema(booksTable).omit({ id: true, createdAt: true });
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;
