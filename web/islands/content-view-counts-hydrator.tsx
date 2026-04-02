import { onMount } from "solid-js";
import { fetchPostViewCounts, formatViewCountLabel } from "@web/lib/content-views";

type ContentViewCountsHydratorProps = {
  slugs: string[];
};

export function ContentViewCountsHydrator(props: ContentViewCountsHydratorProps) {
  onMount(() => {
    const placeholders = Array.from(
      document.querySelectorAll<HTMLSpanElement>("[data-post-view-count]"),
    );

    if (placeholders.length === 0 || props.slugs.length === 0) return;

    void fetchPostViewCounts(props.slugs)
      .then((result) => {
        for (const placeholder of placeholders) {
          const slug = placeholder.dataset.postViewCount;
          if (!slug) continue;

          placeholder.hidden = false;
          placeholder.textContent = formatViewCountLabel(result[slug] ?? 0);
        }
      })
      .catch(() => {
        for (const placeholder of placeholders) {
          placeholder.hidden = true;
          placeholder.textContent = "";
        }
      });
  });

  return null;
}
