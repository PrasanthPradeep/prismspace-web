import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { BackgroundManager } from "@/components/BackgroundManager";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import { DynamicIsland } from "@/components/DynamicIsland";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Prism Dev Browser",
  description: "AI-Powered Developer Dashboard and Browser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <SmoothCursor />
        <DynamicIsland />
        <BackgroundManager />
        {children}
      </body>
    </html>
  );
}
