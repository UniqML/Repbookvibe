const AVATAR_BASE_URL = "https://api.dicebear.com/7.x/avataaars/svg";

function normalizeSeed(seed?: string | null) {
  return (seed || "bookvibe-reader").trim() || "bookvibe-reader";
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getDefaultAvatarSeed(user?: { email?: string | null; displayName?: string | null; id?: number | null } | null) {
  if (!user) return "bookvibe-reader";
  return user.email || user.displayName || `reader-${user.id ?? "bookvibe"}`;
}

export function getAvatarUrl(seed?: string | null) {
  return `${AVATAR_BASE_URL}?seed=${encodeURIComponent(normalizeSeed(seed))}`;
}

export function generateAvatarSeeds(email?: string | null) {
  const base = normalizeSeed(email);
  const hash = hashString(base);
  return Array.from({ length: 12 }, (_, index) => `bookvibe-${hash}-${index + 1}`);
}
