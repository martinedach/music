import type { Metadata, Viewport } from "next";
import { Playfair_Display, Special_Elite } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const typewriter = Special_Elite({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-type",
  display: "swap",
});

export const metadata: Metadata = {
  title: site.name,
  description: site.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b2415",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${typewriter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
