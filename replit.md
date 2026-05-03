# BookVibe

A Russian-language mobile-first reading diary app. The entire UI renders inside a phone-shell (mock mobile device centered on desktop, 430px wide). Users track books, emotions, music, images, and diary entries for each book they read.

## Architecture

**Monorepo (pnpm workspaces):**
- `artifacts/bookvibe` — React + Vite frontend (port 22200, served at `/`)
- `artifacts/api-server` — Express.js backend (port 8080, served at `/api`)
- `lib/api-spec` — OpenAPI 3.0 spec (`openapi.yaml`)
- `lib/api-zod` — Zod schemas generated from OpenAPI (exports `./generated/api` only — NOT `./generated/types`)
- `lib/api-client-react` — React Query hooks generated via Orval
- `lib/db` — Drizzle ORM + PostgreSQL schema

## Database Tables

- `saved_books` — User's book library (title, author, cover, pages, read_pages, status, shelf, vibe[], rating)
- `diary_entries` — Reading diary per book (quote, note, ratings JSONB, music JSONB, images[], stickers[])
- `chat_messages` — Genre chat rooms (room_id, author, text, reply_to, sticker, image_url)

## Frontend Structure (artifacts/bookvibe/src/)

- `App.tsx` — Root: QueryClient provider, theme state, tab routing
- `styles/bookvibe.css` — CSS custom properties for 3 themes (academia, romance, forest) + high contrast
- `index.css` — Imports bookvibe.css, Tailwind v4, maps CSS vars to Tailwind tokens
- `components/PhoneShell.tsx` — The phone container (430px, rounded, grid layout)
- `components/Hero.tsx` — 190px hero header with background image + dark gradient overlay
- `components/BottomNav.tsx` — 5-tab bottom nav with floating center button
- `components/AuthForm.tsx` — Login/register/guest form (localStorage auth)
- `hooks/useAuth.ts` — Auth state (localStorage, no backend)
- `hooks/useBookState.ts` — Active book id (localStorage)
- `tabs/BookTab.tsx` — Book search, progress tracking, diary creation (largest tab)
- `tabs/ChatsTab.tsx` — Genre chat rooms with real-time messages
- `tabs/ShelvesTab.tsx` — Book library with filter chips
- `tabs/TrackersTab.tsx` — Stats, 30-day activity calendar, reading forecast
- `tabs/ProfileTab.tsx` — Profile, auth, theme switcher, hero image picker

## Themes

Three CSS variable themes applied to `.app` via class:
- `.theme-academia` — Dark Academia: `#b8895d` accent, `#18110e` bg
- `.theme-romance` — Pink Romance: `#c75f87` accent, `#26141c` bg
- `.theme-forest` — Fantasy Forest: `#5d8b67` accent, `#101b13` bg
- `.high-contrast` — Accessibility mode

## Backend Routes (artifacts/api-server/src/routes/)

- `books.ts` — `GET /api/books/search` (Google Books + Open Library), `GET/POST/DELETE /api/books`
- `diary.ts` — `GET/POST /api/diary`
- `chats.ts` — `GET /api/chats/rooms`, `GET/POST /api/chats/:roomId/messages`
- `music.ts` — `GET /api/music/search` (Deezer API with fallback)
- `images.ts` — `GET /api/images/search` (Unsplash with curated fallback)
- `ai.ts` — `POST /api/ai/diary-helper` (OpenAI or local template fallback)

## Auth

Simple localStorage-based auth (no backend). Supports email login, guest login, register. No Firebase.

## External APIs

- **Google Books API** — book search (no key required)
- **Open Library API** — book search fallback (no key required)
- **Deezer API** — music search (no key required)
- **Unsplash API** — image search (requires `UNSPLASH_ACCESS_KEY` env var; falls back to curated list)
- **OpenAI API** — AI diary helper (requires `OPENAI_API_KEY` env var; falls back to template)

## Codegen

```bash
pnpm --filter @workspace/api-spec run codegen
```

Regenerates Zod schemas + React Query hooks from `lib/api-spec/openapi.yaml`.

## Key Notes

- `lib/api-zod/src/index.ts` must export only `./generated/api` (NOT `./generated/types`) to avoid duplicate export conflicts
- The phone-shell grid: `190px hero / 1fr content / 92px bottom-nav`
- Chat rooms are seeded with welcome messages on first request
- All UI text is in Russian
