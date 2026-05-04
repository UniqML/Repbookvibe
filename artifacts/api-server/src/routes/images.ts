import { Router } from "express";
import { SearchImagesQueryParams } from "@workspace/api-zod";

const router = Router();

type ImageItem = {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  author: string;
};

type CachedImages = {
  expiresAt: number;
  items: ImageItem[];
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const imageSearchCache = new Map<string, CachedImages>();

const CURATED_IMAGES = [
  "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80",
];

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function searchPinterest(q: string, limit: number): Promise<ImageItem[]> {
  const pinterestKey = process.env["PINTEREST_API_KEY"];
  if (!pinterestKey) return [];

  const url = new URL("https://api.pinterest.com/v5/search/pins");
  url.searchParams.set("query", q);
  url.searchParams.set("page_size", String(limit));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${pinterestKey}` },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return [];

  const data = await response.json() as { items?: unknown[] };
  return (data.items || []).map((item) => {
    const pin = getRecord(item);
    const media = getRecord(pin.media);
    const images = getRecord(media.images);
    const image1200 = getRecord(images["1200x"]);
    const image600 = getRecord(images["600x"]);
    const image400 = getRecord(images["400x300"]);
    const image150 = getRecord(images["150x150"]);
    const url = getString(image1200.url) || getString(image600.url) || getString(image400.url) || getString(image150.url);
    const thumbnail = getString(image400.url) || getString(image150.url) || url;
    const title = getString(pin.title) || getString(pin.description) || q;
    const boardOwner = getRecord(pin.board_owner);

    return {
      id: getString(pin.id) || `pinterest-${url}`,
      url,
      title,
      thumbnail,
      author: getString(boardOwner.username) || "Pinterest",
    };
  }).filter(item => item.url);
}

async function searchUnsplash(q: string, limit: number): Promise<ImageItem[]> {
  const unsplashKey = process.env["UNSPLASH_ACCESS_KEY"];
  if (!unsplashKey) return [];

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", String(limit));
  url.searchParams.set("orientation", "portrait");

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${unsplashKey}` },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return [];

  const data = await response.json() as { results?: unknown[] };
  return (data.results || []).map((photo) => {
    const p = getRecord(photo);
    const urls = getRecord(p.urls);
    const user = getRecord(p.user);
    const imageUrl = getString(urls.regular) || getString(urls.full) || getString(urls.small);
    const thumbnail = getString(urls.thumb) || getString(urls.small) || imageUrl;

    return {
      id: getString(p.id) || `unsplash-${imageUrl}`,
      title: getString(p.alt_description) || getString(p.description) || q,
      url: imageUrl,
      thumbnail,
      author: getString(user.name) || "Unsplash",
    };
  }).filter(item => item.url);
}

function getCuratedImages(q: string, limit: number): ImageItem[] {
  return CURATED_IMAGES.slice(0, limit).map((url, index) => ({
    id: `curated-${index}`,
    title: q,
    url,
    thumbnail: url,
    author: "Curated",
  }));
}

router.get("/images/search", async (req, res) => {
  const parsed = SearchImagesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const q = parsed.data.q.trim();
  const limit = Math.min(Math.max(parsed.data.limit, 1), 50);
  const cacheKey = `${q.toLowerCase()}:${limit}`;
  const cached = imageSearchCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.items);
    return;
  }

  try {
    const pinterestItems = await searchPinterest(q, limit);
    const items = pinterestItems.length > 0
      ? pinterestItems
      : await searchUnsplash(q, limit);
    const result = items.length > 0 ? items : getCuratedImages(q, limit);

    imageSearchCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      items: result,
    });

    res.json(result);
  } catch {
    const result = getCuratedImages(q, limit);
    imageSearchCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      items: result,
    });
    res.json(result);
  }
});

export default router;
