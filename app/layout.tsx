import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Golf Season Scorecard",
  description: "Track your golf season — scores, standings, and stats.",
};

export const viewport: Viewport = {
  themeColor: "#247334",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans text-fairway-900">{children}</body>
    </html>
  );
}
