# Identify

Tech projects written up like stories, and the CVs of the people who built them.

Next.js 16 · TypeScript · Tailwind CSS v4 · Supabase · Zod

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the two values (see below)
npm run dev                  # http://localhost:3000
```

Without Supabase keys the app still runs: `/preview/classic` shows the CV template with sample data, and other pages show a setup notice.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. **Project Settings → API**: copy the project URL and the publishable key into `.env.local`.
3. **Create the database**: open **SQL Editor** and run each file in `supabase/migrations/` in order:
   `20261027000000_init.sql`, then `20261028000000_growth.sql` (follows, notifications, people search),
   then `20261029000000_library_stats.sql` (Library bookmarks, view/read stats),
   then `20261030000000_account.sql` (lets people delete their own account),
   then `20261031000000_messages.sql` (private messages, delivered live with Supabase Realtime),
   then `20261101000000_history.sql` (Library → History),
   then `20261102000000_discover.sql` (Discover listings, claims, removals). To manage Discover at `/admin/discover`,
   make yourself an admin once: `insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';`
   The later files add Discover activity, claim notes, message replies/attachments and `20261108000000_discoveries.sql` + `20261109000000_discoveries_members.sql` + `20261110000000_editorial.sql`
   (editorial features about people on Discover); run every file in the folder, in name order.
   (Or with the CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.)
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: add `http://localhost:3000/auth/callback`
5. **Google sign-in** (optional): in [Google Cloud Console](https://console.cloud.google.com/) create a project, set up the
   **OAuth consent screen** (External; app name, support email), then **Credentials → Create credentials → OAuth client ID**
   (type: Web application). Add Authorized redirect URI `https://<your-project-ref>.supabase.co/auth/v1/callback`.
   Paste the client ID and secret into **Supabase → Authentication → Providers → Google** and enable it.
6. **GitHub sign-in** (optional): create an OAuth app at GitHub → Settings → Developer settings → OAuth Apps with callback URL
   `https://<your-project-ref>.supabase.co/auth/v1/callback`, then paste its client ID and secret into
   **Authentication → Providers → GitHub** in Supabase.

## Imports (optional keys)

- **CV import** (`/settings` → Upload CV): PDF or DOCX is converted to text, then sent to the first AI provider that has a key in `.env.local`, in `AI_PROVIDERS` order (default `groq,gemini,openrouter,anthropic`). If none are configured or all fail, a free rule-based parser fills what it can. See `.env.example` for keys and model overrides.
- **GitHub import** (Write → "Start from a GitHub repo"): uses GitHub's public API, no AI. Add `GITHUB_TOKEN` to raise the rate limit.

## Deploy (Vercel)

1. Push this folder to a GitHub repo and import it at [vercel.com/new](https://vercel.com/new) (framework: Next.js, no settings to change).
2. **Environment variables**: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, plus any optional import keys you use.
3. After the first deploy, in Supabase **Authentication → URL Configuration**: set Site URL to your Vercel URL and add
   `https://<your-domain>/auth/callback` to Redirect URLs (keep the localhost ones for development).
4. Use Node.js 22 (Vercel: Project Settings → Build and Deployment → Node.js Version); Supabase is dropping Node 20.

## Emails

Auth emails are sent by Supabase through Resend (Authentication → Emails → SMTP Settings: host `smtp.resend.com`,
port `465`, user `resend`, password = Resend API key, sender `hello@identify.com.im`). The domain's DNS records are
in Namecheap; replies to hello@ are forwarded to the team Gmail.

The branded templates live in `supabase/templates/`. Paste each into **Authentication → Emails → Templates**:

| Supabase template | File | Subject |
|---|---|---|
| Confirm sign up | `confirm-signup.html` | Confirm your email for Identify |
| Reset password | `reset-password.html` | Reset your Identify password |
| Change email address | `change-email.html` | Confirm your new email for Identify |
| Magic link | `magic-link.html` | Your Identify sign-in link |

Their links go to `/auth/confirm?token_hash=…`, which works on any device (unlike `/auth/callback`, which needs the
browser that started sign-in). The logo is `public/email/logo.png`, loaded from the live site.

## Project layout

```
src/
  app/
    page.tsx                 home (hero + newest builders; project feed in Stage 2)
    [username]/page.tsx      public profile = CV page
    login/                   email/password + GitHub sign-in
    onboarding/              pick a username after first sign-in
    auth/callback, signout   auth route handlers
    preview/[template]/      template preview with sample data
  components/cv/             CV templates (classic = template #1) and the template registry
  lib/cv/schema.ts           the CV data shape every template renders
  lib/themes.ts              color presets + fonts
  lib/supabase/              server, browser, public and proxy clients
  proxy.ts                   refreshes the session, guards signed-in routes
supabase/migrations/         database schema + Row Level Security
```
