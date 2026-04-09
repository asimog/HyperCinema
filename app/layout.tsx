import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk, Syne } from "next/font/google";
import { AppClientProviders } from "@/components/providers/AppClientProviders";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const bodyFont = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const displayFont = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "HyperMyths",
  description:
    "HyperMyths turns X profiles, wallets, and memecoins into cinematic short-form video. Free. Powered by xAI. Follow @HyperMythsX on X. hypermyths.com",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`site-body ${bodyFont.variable} ${monoFont.variable} ${displayFont.variable} antialiased`}
      >
        <AppClientProviders>
          <SiteHeader />
          <div className="site-content">{children}</div>
          <SiteFooter />
        </AppClientProviders>
      </body>
    </html>
  );
}
