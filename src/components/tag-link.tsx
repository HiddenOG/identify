import Link from "next/link";

export function tagHref(tag: string) {
  return `/tags/${encodeURIComponent(tag)}`;
}

export function TagLink({ tag, small = false }: { tag: string; small?: boolean }) {
  return (
    <Link
      href={tagHref(tag)}
      className={`rounded-full bg-surface text-foreground hover:bg-surface-hover ${small ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}
    >
      {tag}
    </Link>
  );
}
