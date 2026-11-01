"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { AuthorAvatar } from "@/components/author-avatar";
import { AppearancePicker } from "@/components/theme";
import { formatDate } from "@/lib/projects";
import { SITE_NAME } from "@/lib/site";
import {
  deleteAccount,
  setOpenToWork,
  signOutEverywhere,
  updateEmail,
  updatePassword,
  updateUsername,
  type AccountState,
} from "./account-actions";

type Props = {
  email: string | null;
  username: string;
  name: string;
  avatarUrl: string | null;
  openToWork: boolean;
  hasPassword: boolean;
  joined: string;
};

const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <path d="M6 14 14 6M7.5 6H14v6.5" />
  </svg>
);

const field = "w-full rounded-md border border-line bg-background px-3 py-2 outline-none focus:border-foreground";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line pt-8 pb-6 first:pt-0 last:border-b-0">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** One settings row: title + description on the left, current value or control on the right. */
function Row({ title, description, aside, danger }: { title: string; description: ReactNode; aside?: ReactNode; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className={danger ? "text-danger" : ""}>{title}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {aside && <div className="shrink-0 text-muted">{aside}</div>}
    </div>
  );
}

/** A row that opens an inline form underneath when clicked. */
function EditRow({ title, description, value, danger, children }: { title: string; description: string; value?: ReactNode; danger?: boolean; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="block w-full text-left">
        <Row title={title} description={description} aside={value} danger={danger} />
      </button>
      {open && <div className="mb-4 rounded-lg border border-line p-4">{children(() => setOpen(false))}</div>}
    </div>
  );
}

function Feedback({ state }: { state: AccountState }) {
  if (state.error) return <p className="text-sm text-danger">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-success">{state.ok}</p>;
  return null;
}

function FormButtons({ pending, close, label, danger }: { pending: boolean; close: () => void; label: string; danger?: boolean }) {
  return (
    <div className="flex justify-end gap-3">
      <button type="button" onClick={close} className="rounded-full border border-line px-4 py-1.5 text-sm">
        Cancel
      </button>
      <button
        disabled={pending}
        className={`rounded-full px-4 py-1.5 text-sm disabled:opacity-50 ${danger ? "bg-danger text-white" : "bg-foreground text-background"}`}
      >
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}

function UsernameForm({ username, close }: { username: string; close: () => void }) {
  const [state, action, pending] = useActionState(updateUsername, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Username</span>
        <span className="flex items-center gap-1">
          <span className="text-muted">@</span>
          <input name="username" defaultValue={username} required className={field} autoComplete="off" />
        </span>
      </label>
      <p className="text-xs text-muted">Your profile and project links change to the new username; old links stop working.</p>
      <Feedback state={state} />
      <FormButtons pending={pending} close={close} label="Save" />
    </form>
  );
}

function EmailForm({ email, close }: { email: string | null; close: () => void }) {
  const [state, action, pending] = useActionState(updateEmail, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-muted">New email address</span>
        <input name="email" type="email" defaultValue={email ?? ""} required className={field} />
      </label>
      <Feedback state={state} />
      <FormButtons pending={pending} close={close} label="Send confirmation" />
    </form>
  );
}

function PasswordForm({ close }: { close: () => void }) {
  const [state, action, pending] = useActionState(updatePassword, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-muted">New password</span>
        <input name="password" type="password" minLength={8} required autoComplete="new-password" className={field} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Confirm password</span>
        <input name="confirm" type="password" minLength={8} required autoComplete="new-password" className={field} />
      </label>
      <Feedback state={state} />
      <FormButtons pending={pending} close={close} label="Update password" />
    </form>
  );
}

function DeleteForm({ username, close }: { username: string; close: () => void }) {
  const [state, action, pending] = useActionState(deleteAccount, {});
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm">
        This permanently deletes your CV, projects, likes, comments, followers and uploaded images. It can&apos;t be undone.
      </p>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">
          Type <strong className="text-foreground">{username}</strong> to confirm
        </span>
        <input name="confirm" required autoComplete="off" className={field} />
      </label>
      <Feedback state={state} />
      <FormButtons pending={pending} close={close} label="Delete my account" danger />
    </form>
  );
}

function OpenToWorkToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<AccountState>({});
  return (
    <div>
      <Row
        title="Open to work"
        description="Show a badge on your CV and list you first in People for recruiters."
        aside={
          <input
            type="checkbox"
            checked={on}
            disabled={pending}
            aria-label="Open to work"
            onChange={(e) => {
              const next = e.target.checked;
              setOn(next);
              startTransition(async () => {
                const result = await setOpenToWork(next);
                if (result.error) setOn(!next);
                setState(result);
              });
            }}
            className="size-5 accent-foreground"
          />
        }
      />
      <Feedback state={state} />
    </div>
  );
}

export function AccountSettings({ email, username, name, avatarUrl, openToWork, hasPassword, joined }: Props) {
  return (
    <div className="max-w-3xl">
      <Section title="Profile">
        <EditRow title="Email address" description="The email you sign in with." value={email}>
          {(close) => <EmailForm email={email} close={close} />}
        </EditRow>
        <EditRow title="Username" description="Your @username is also your profile address." value={`@${username}`}>
          {(close) => <UsernameForm username={username} close={close} />}
        </EditRow>
        <Link href="/settings/cv#profile" className="block">
          <Row
            title="Profile information"
            description="Edit your photo, name, headline and location."
            aside={
              <span className="flex items-center gap-3">
                <span className="hidden sm:inline">{name}</span>
                <AuthorAvatar name={name} url={avatarUrl} size={28} />
              </span>
            }
          />
        </Link>
        <Row title="Appearance" description={`Choose how ${SITE_NAME} looks to you.`} aside={<AppearancePicker />} />
        <Link href="/settings/cv#design" className="block">
          <Row title="Profile design" description="Edit your CV's template, colors and font." aside={<ArrowIcon />} />
        </Link>
        <Link href={`/${username}`} className="block">
          <Row title="Download CV as PDF" description="Open your public CV and use Download PDF." aside={<ArrowIcon />} />
        </Link>
      </Section>

      <Section title="Career">
        <OpenToWorkToggle initial={openToWork} />
        <Link href="/people?open=1" className="block">
          <Row title="See who's open to work" description="Browse the people directory with recruiter filters." aside={<ArrowIcon />} />
        </Link>
      </Section>

      <Section title="Security">
        <EditRow
          title={hasPassword ? "Change password" : "Set a password"}
          description={hasPassword ? "Use at least 8 characters." : "You sign in with Google or GitHub. Add a password to sign in with email too."}
        >
          {(close) => <PasswordForm close={close} />}
        </EditRow>
        <form action={signOutEverywhere}>
          <button className="block w-full text-left">
            <Row title="Sign out of all devices" description="Ends your session everywhere, including here." aside={<ArrowIcon />} />
          </button>
        </form>
      </Section>

      <Section title="Account">
        <Row title="Member since" description={`When you joined ${SITE_NAME}.`} aside={formatDate(joined)} />
        <EditRow title="Delete account" description="Permanently delete your account and all of your content." danger>
          {(close) => <DeleteForm username={username} close={close} />}
        </EditRow>
      </Section>
    </div>
  );
}
