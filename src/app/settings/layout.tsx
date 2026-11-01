import { Suspense } from "react";
import { SettingsTabs, SettingsTabsFallback } from "./settings-tabs";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
      <h1 className="text-5xl font-bold tracking-tight">Settings</h1>
      <Suspense fallback={<SettingsTabsFallback />}>
        <SettingsTabs />
      </Suspense>
      <div className="mt-10">{children}</div>
    </main>
  );
}
