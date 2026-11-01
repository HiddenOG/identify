"use client";

import { useActionState } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";

export function OnboardingForm({ defaultName, defaultUsername = "", next = "/" }: { defaultName: string; defaultUsername?: string; next?: string }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Username</span>
        <div className="flex items-center rounded-md border border-line focus-within:border-foreground">
          <span className="pl-3 text-muted">/</span>
          <input
            name="username"
            required
            defaultValue={defaultUsername}
            pattern="[a-zA-Z0-9][a-zA-Z0-9_\-]{2,29}"
            autoComplete="username"
            className="w-full bg-transparent px-1 py-2 outline-none"
          />
        </div>
        <span className="mt-1 block text-xs text-muted">This becomes your public link.</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Full name</span>
        <input
          name="full_name"
          required
          defaultValue={defaultName}
          className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-foreground"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Headline</span>
        <input
          name="headline"
          placeholder="e.g. Backend Engineer · Python & Go"
          maxLength={120}
          className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-foreground"
        />
      </label>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        disabled={pending}
        className="w-full rounded-full bg-foreground px-4 py-3 font-medium text-background disabled:opacity-60"
      >
        {pending ? "Saving…" : "Create my page"}
      </button>
    </form>
  );
}
