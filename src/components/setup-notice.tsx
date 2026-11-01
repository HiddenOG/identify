/** Shown when Supabase keys are missing from .env.local. */
export function SetupNotice() {
  return (
    <div className="rounded-lg border border-line bg-highlight p-4 text-sm">
      <p className="font-medium">Supabase is not connected yet.</p>
      <p className="mt-1 text-muted">
        Copy <code>.env.example</code> to <code>.env.local</code> and add your project URL and publishable key. See the
        README for setup steps.
      </p>
    </div>
  );
}
