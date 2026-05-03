import { getAvatarUrl, getDefaultAvatarSeed } from "@/lib/avatar";

interface UserAvatarProps {
  seed?: string | null;
  name?: string | null;
  email?: string | null;
  id?: number | null;
  size: number;
  radius?: number;
}

export function UserAvatar({ seed, name, email, id, size, radius }: UserAvatarProps) {
  const avatarSeed = seed || getDefaultAvatarSeed({ email, displayName: name, id });

  return (
    <img
      src={getAvatarUrl(avatarSeed)}
      alt={name ? `${name} avatar` : "avatar"}
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? Math.round(size * 0.28),
        objectFit: "cover",
        flexShrink: 0,
        background: "linear-gradient(135deg, var(--paper-soft), color-mix(in srgb, var(--accent), white 80%))",
        border: "1px solid color-mix(in srgb, var(--accent), transparent 55%)",
        boxShadow: size >= 80 ? "0 6px 18px color-mix(in srgb, var(--accent), transparent 60%)" : "none",
      }}
      loading="lazy"
    />
  );
}
