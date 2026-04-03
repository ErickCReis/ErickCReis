import { t } from "virtual:translate";
import { apiClient } from "@web/lib/api";

export function formatViewCountLabel(viewCount: number) {
  return `${viewCount} ${viewCount === 1 ? t("view") : t("views")}`;
}

export async function fetchPostViewCounts(slugs: string[]) {
  const uniqueSlugs = Array.from(new Set(slugs));
  if (uniqueSlugs.length === 0) {
    return {};
  }

  const { data, error } = await apiClient.content.views.get({
    query: { slugs: uniqueSlugs },
    fetch: { cache: "no-store" },
  });
  if (error || !data) {
    throw new Error("Failed to fetch blog post view counts");
  }

  return data;
}

export async function registerPostView(slug: string) {
  const { data, error } = await apiClient.content.views.post(
    { slug },
    {
      fetch: { cache: "no-store" },
    },
  );
  if (error || !data) {
    throw new Error("Failed to register blog post view");
  }

  return data;
}
