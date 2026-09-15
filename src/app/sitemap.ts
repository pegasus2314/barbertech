import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const supabase = await createClient();

  const { data: barbershops } = await supabase
    .from("barbershops")
    .select("slug, updated_at")
    .eq("is_published", true);

  const shopEntries: MetadataRoute.Sitemap = (barbershops ?? []).flatMap((b) => {
    const lastModified = b.updated_at ? new Date(b.updated_at) : undefined;
    return [
      {
        url: `${base}/${b.slug}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      {
        url: `${base}/${b.slug}/reservar`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ];
  });

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...shopEntries,
  ];
}
