import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SCRATCH — Season Desk",
    short_name: "SCRATCH",
    description:
      "A golf season scoring desk — rounds, handicaps, net, match play, and standings.",
    start_url: "/",
    display: "standalone",
    background_color: "#04100B",
    theme_color: "#04100B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
