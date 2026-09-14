import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "LumaForge — Creative AI Studio",
    template: "%s · LumaForge",
  },
  description:
    "Discover, recreate, and produce cinematic image and video concepts in one focused creative workspace.",
  applicationName: "LumaForge",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/mark.svg", apple: "/brand/mark.svg" },
  openGraph: {
    title: "LumaForge — Creative AI Studio",
    description:
      "From inspiration to a finished visual in one continuous workflow.",
    images: [{ url: "/brand/lumaforge-cover.png", width: 1536, height: 1024 }],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
