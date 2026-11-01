"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/discover/actions";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Hidden fields sent with the form, e.g. { id }. */
  fields?: Record<string, string>;
  children: ReactNode;
  className?: string;
  /** Hide the form once it succeeds, leaving only the message. */
  hideOnSuccess?: boolean;
};

/** A form for a server action that answers with a message or an error, shown under it. */
export function ActionForm({ action, fields = {}, children, className, hideOnSuccess }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const done = hideOnSuccess && state?.message;

  return (
    <div>
      {!done && (
        <form action={formAction} aria-busy={pending}>
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {/* The layout classes go on the fieldset, since it's what wraps the fields. */}
          <fieldset disabled={pending} className={className ?? "contents"}>
            {children}
          </fieldset>
        </form>
      )}
      {state?.message && (
        <p className="mt-2 text-sm text-success" role="status">
          {state.message}
        </p>
      )}
      {state?.error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
