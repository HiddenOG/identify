import Link from "next/link";
import { AuthorAvatar } from "@/components/author-avatar";
import type { ProfileView } from "@/lib/profiles";

export function PersonLink({ person, size = 36 }: { person: ProfileView; size?: number }) {
  const name = person.fullName || person.username;
  return (
    <Link href={`/${person.username}`} className="flex items-center gap-3 hover:underline">
      <AuthorAvatar name={name} url={person.avatarUrl} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="block truncate text-xs text-muted">{person.headline || `@${person.username}`}</span>
      </span>
      {person.openToWork && (
        <span className="ml-auto shrink-0 rounded-full border border-foreground px-2 py-0.5 text-[10px] font-semibold uppercase">
          Open to work
        </span>
      )}
    </Link>
  );
}
