import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";

export const ratingsTable = pgTable(
  "ratings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    bookId: integer("book_id").notNull(),
    score: integer("score").notNull(), // 1-5 stars
    review: text("review"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userBookUnique: unique("ratings_user_book_unique").on(t.userId, t.bookId),
  })
);

export type Rating = typeof ratingsTable.$inferSelect;
