"use client";

import { useActionState } from "react";
import { addComment, type CommentState } from "@/lib/social-actions";

export function CommentForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(addComment, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      <textarea
        name="body"
        required
        maxLength={5000}
        rows={3}
        placeholder="What do you think? Ask about the approach, stack or results…"
        className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-foreground"
      />
      <div className="flex items-center justify-end gap-3">
        {state.error && <p className="mr-auto text-sm text-danger">{state.error}</p>}
        <button
          disabled={pending}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {pending ? "Posting…" : "Respond"}
        </button>
      </div>
    </form>
  );
}
