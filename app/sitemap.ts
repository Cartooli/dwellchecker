import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.condition.homes").replace(
    "https://condition.homes",
    "https://www.condition.homes",
  );
  return [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/dashboard`, lastModified: new Date(), priority: 0.8 },
    { url: `${base}/dashboard/compare`, lastModified: new Date(), priority: 0.6 },
  ];
}
