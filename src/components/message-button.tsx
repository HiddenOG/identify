import Link from "next/link";
import { MessageIcon } from "@/components/icons";
import { startConversation } from "@/lib/message-actions";

type Props = { profileId: string; signedIn: boolean; loginHref: string; className?: string };

// A quiet text action, like Download PDF beside it.
const base = "inline-flex shrink-0 items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-foreground hover:underline";

/** Opens a private conversation with this person (sign-in first for visitors). */
export function MessageButton({ profileId, signedIn, loginHref, className = "" }: Props) {
  if (!signedIn) {
    return (
      <Link href={loginHref} className={`${base} ${className}`}>
        <MessageIcon size={18} /> Message
      </Link>
    );
  }
  return (
    <form action={startConversation.bind(null, profileId)}>
      <button className={`${base} ${className}`}>
        <MessageIcon size={18} /> Message
      </button>
    </form>
  );
}
