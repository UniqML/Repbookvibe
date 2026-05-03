import { Router } from "express";
import { SearchImagesQueryParams } from "@workspace/api-zod";

const router = Router();

const CURATED_IMAGES = [
  "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80",
];

router.get("/images/search", async (req, res) => {
  const parsed = SearchImagesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { q, limit } = parsed.data;
  const unsplashKey = process.env["UNSPLASH_ACCESS_KEY"];
  if (unsplashKey) {
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${limit}&orientation=portrait`;
      const response = await fetch(url, {
        headers: { Authorization: `Client-ID ${unsplashKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data = await response.json() as { results?: unknown[] };
        const items = (data.results || []).map((photo: unknown) => {
          const p = photo as Record<string, unknown>;
          const urls = (p.urls || {}) as Record<string, string>;
          const user = (p.user || {}) as Record<string, string>;
          return {
            title: (p.alt_description as string) || q,
            url: urls.regular || "",
            thumb: urls.thumb || "",
            author: user.name || "",
            source: "unsplash",
          };
        });
        if (items.length > 0) {
          res.json({ query: q, items });
          return;
        }
      }
    } catch {
      // fallback below
    }
  }
  const items = CURATED_IMAGES.slice(0, limit).map(url => ({
    title: q,
    url,
    thumb: url,
    author: "Curated",
    source: "curated",
  }));
  res.json({ query: q, items });
});

export default router;
