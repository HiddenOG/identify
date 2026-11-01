/* eslint-disable @next/next/no-img-element -- avatars come from arbitrary OAuth/storage hosts */

export function AuthorAvatar({ name, url, size = 32 }: { name: string; url: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.45 };
  return url ? (
    // Cut-out portraits are full-length and transparent: crop to the head and shoulders on a soft backdrop.
    <img src={url} alt="" style={style} className="shrink-0 rounded-full bg-surface object-cover object-top" />
  ) : (
    <span style={style} className="grid shrink-0 place-items-center rounded-full bg-brand font-semibold text-brand-ink">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
