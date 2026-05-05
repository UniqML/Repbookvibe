import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const friendshipsTable = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  friendId: integer("friend_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Friendship = typeof friendshipsTable.$inferSelect;
