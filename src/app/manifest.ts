import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LumaForge — Creative AI Studio",
    short_name: "LumaForge",
    description: "A media-first creative AI workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090a",
    theme_color: "#08090a",
    icons: [{ src: "/brand/mark.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
