import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "יומן הספר - ניהול נכסים",
    short_name: "יומן הספר",
    description: "נהל את נכסי ההשכרה שלך בקלות",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f3edde",
    theme_color: "#f3edde",
    dir: "rtl",
    lang: "he",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
