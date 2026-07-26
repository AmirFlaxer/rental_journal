import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // short_name הוא הכיתוב מתחת לאייקון במסך-הבית, ואנדרואיד קוטע אותו סביב 12-13
    // תווים - ולכן הוא מקוצר ל"שכירויות" ולא חוזר על השם המלא.
    name: "ניהול שכירויות",
    short_name: "שכירויות",
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
