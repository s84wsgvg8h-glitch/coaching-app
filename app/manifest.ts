import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Limitless Coaching",
    short_name: "Limitless",
    description: "Coaching app voor atleten en coaches",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0b10",
    theme_color: "#0a0b10",
    lang: "nl",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/limitless-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/limitless-icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/limitless-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
