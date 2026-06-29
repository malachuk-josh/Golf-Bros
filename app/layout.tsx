import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCRATCH // Season Desk",
  description:
    "A golf season scoring desk — rounds, handicaps, net, match play, and standings.",
  applicationName: "SCRATCH",
  appleWebApp: {
    capable: true,
    title: "SCRATCH",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#04100B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Apply the saved daylight/dark preference before paint to avoid a flash.
const themeScript = `try{if(localStorage.getItem('scratch-theme')==='daylight'){document.documentElement.classList.add('daylight')}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans text-ink">{children}</body>
    </html>
  );
}
