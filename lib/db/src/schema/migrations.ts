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


    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS saved_books (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        guest_key TEXT,
        external_id TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'manual',
        title TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        cover TEXT NOT NULL DEFAULT '',
        pages INTEGER NOT NULL DEFAULT 0,
        read_pages INTEGER NOT NULL DEFAULT 0,
        isbn TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Хочу прочитать',
        shelf TEXT NOT NULL DEFAULT 'Новые',
        vibe JSONB NOT NULL DEFAULT '[]'::jsonb,
        rating REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS diary_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES saved_books(id) ON DELETE CASCADE,
        quote TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
        music JSONB NOT NULL DEFAULT '{}'::jsonb,
        images JSONB NOT NULL DEFAULT '[]'::jsonb,
        stickers JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        room_id TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT 'Reader',
        author_avatar_seed TEXT,
        text TEXT NOT NULL DEFAULT '',
        reply_to INTEGER,
        sticker TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '',
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

    // Add ownership columns to books table if they don't exist
    await db.execute(sql`
      ALTER TABLE saved_books
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    `);

    await db.execute(sql`
      ALTER TABLE saved_books
      ADD COLUMN IF NOT EXISTS guest_key TEXT;
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS saved_books_guest_key_idx
      ON saved_books (guest_key);
    `);

    await db.execute(sql`ALTER TABLE saved_books ADD COLUMN IF NOT EXISTS external_id TEXT NOT NULL DEFAULT '';`);
    await db.execute(sql`ALTER TABLE saved_books ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';`);
    await db.execute(sql`ALTER TABLE saved_books ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';`);
    await db.execute(sql`ALTER TABLE saved_books ADD COLUMN IF NOT EXISTS cover TEXT NOT NULL DEFAULT '';`);
    await db.execute(sql`ALTER TABLE saved_books ADD COLUMN IF NOT EXISTS pages INTEGER NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE saved_books ADD COLUMN IF NOT EXISTS read_pages INTEGER NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE saved_books ADD COLUMN IF NOT EXISTS shelf TEXT NOT NULL DEFAULT 'Новые';`);
    await db.execute(sql`ALTER TABLE saved_books ADD COLUMN IF NOT EXISTS vibe JSONB NOT NULL DEFAULT '[]'::jsonb;`);


    // Add user_id to diary_entries table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE diary_entries 
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    `);

    await db.execute(sql`
      ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS author_avatar_seed TEXT;
    `);

    await db.execute(sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sticker TEXT NOT NULL DEFAULT '';`);
    await db.execute(sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';`);
    await db.execute(sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to INTEGER;`);


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
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
    `);

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
