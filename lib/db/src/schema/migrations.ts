import { db } from "../index";
import { sql } from "drizzle-orm";

export async function runMigrations() {
  try {
    // Create users table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        verification_code TEXT,
        is_verified BOOLEAN NOT NULL DEFAULT false,
        avatar_url TEXT,
        avatar_seed TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Add avatar_url column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);

    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar_seed TEXT;
    `);

    // Add user_id to books table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE saved_books 
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    `);

    // Add user_id to diary_entries table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE diary_entries 
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    `);

    await db.execute(sql`
      ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS author_avatar_seed TEXT;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moderation_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        room_id TEXT NOT NULL,
        message_text TEXT NOT NULL,
        sanitized_text TEXT,
        violation_type TEXT NOT NULL,
        matched_terms TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
        room_id TEXT NOT NULL,
        reporter_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT NOT NULL DEFAULT 'inappropriate',
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Create ratings table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
        review TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, book_id)
      );
    `);

    console.log("✓ Migrations completed");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}
