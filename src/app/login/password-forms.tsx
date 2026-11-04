"use client";

import { useActionState } from "react";
import { requestPasswordReset, setNewPassword, type AuthState } from "./actions";

const field = "w-full rounded-md border border-line px-3 py-2 outline-none focus:border-foreground";
const button = "w-full rounded-full bg-foreground px-4 py-3 font-medium text-background disabled:opacity-60";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  if (state.message) return <p className="rounded-lg border border-line bg-surface p-4 text-sm">{state.message}</p>;

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className={button}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(setNewPassword, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">New password</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Type it again</span>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className={button}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
