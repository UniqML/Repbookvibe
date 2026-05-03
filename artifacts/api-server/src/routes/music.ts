import { Router } from "express";
import { SearchMusicQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/music/search", async (req, res) => {
  const parsed = SearchMusicQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { q, limit } = parsed.data;
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Deezer API error");
    const data = await response.json() as { data?: unknown[] };
    const items = (data.data || []).map((track: unknown) => {
      const t = track as Record<string, unknown>;
      const artist = (t.artist || {}) as Record<string, string>;
      const album = (t.album || {}) as Record<string, string>;
      return {
        title: t.title || "",
        artist: artist.name || "",
        album: album.title || "",
        cover: album.cover_medium || "",
        preview: t.preview || "",
        link: t.link || "",
        source: "deezer",
      };
    });
    if (items.length > 0) {
      res.json({ query: q, items });
      return;
    }
  } catch {
    // fallback below
  }
  res.json({
    query: q,
    items: [{
      title: q,
      artist: "Добавить вручную",
      album: "Пользовательская ассоциация",
      cover: "",
      preview: "",
      link: `https://open.spotify.com/search/${encodeURIComponent(q)}`,
      source: "manual_spotify_link",
    }],
  });
});

export default router;
