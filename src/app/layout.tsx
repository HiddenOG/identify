import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { MobileNav } from "@/components/mobile-nav";
import { SidebarShell, SidebarSync } from "@/components/sidebar";
import { SidebarContent, SidebarFallback } from "@/components/sidebar-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeSync } from "@/components/theme";
import { cvFontVariables } from "@/lib/fonts";
import { SIDEBAR_SCRIPT } from "@/lib/sidebar";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Long-form reading and display serif (project bodies, landing headlines). */
const sourceSerif = Source_Serif_4({
  variable: "--font-reading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes link-preview images and URLs absolute (WhatsApp, LinkedIn and X need full URLs).
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Your own CV website, and the projects behind it written up like stories.",
  openGraph: { siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} ${cvFontVariables} h-full antialiased`}
    >
      <head>
        {/* Set data-theme and data-sidebar before the first paint; see lib/theme.ts and lib/sidebar.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT + ";" + SIDEBAR_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeSync />
        <Suspense>
          <SidebarSync />
        </Suspense>
        <SiteHeader />
        <div className="flex flex-1">
          <SidebarShell>
            <Suspense fallback={<SidebarFallback />}>
              <SidebarContent />
            </Suspense>
          </SidebarShell>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </div>
        <Suspense>
          <MobileNav />
        </Suspense>
      </body>
    </html>
  );
}
