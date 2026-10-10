/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { BackgroundManager } from "@/components/BackgroundManager";
import { DynamicIsland } from "@/components/DynamicIsland";
import { PostHogProvider } from "./providers";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} AI Developer Workspace`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "PrismSpace" }],
  creator: "PrismSpace",
  publisher: "PrismSpace",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} AI Developer Workspace`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/Logo/new_logo_wide.png", width: 160, height: 38, alt: "PrismSpace" }],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} AI Developer Workspace`,
    description: SITE_DESCRIPTION,
    images: ["/Logo/new_logo_wide.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/Logo/new_logo.png",
    apple: "/Logo/new_logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090c12",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark font-sans")}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              description: SITE_DESCRIPTION,
            }),
          }}
        />
        <PostHogProvider>
          <DynamicIsland />
          <BackgroundManager />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
