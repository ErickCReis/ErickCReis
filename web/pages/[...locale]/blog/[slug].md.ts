import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getLocalizedPath } from "@web/i18n";
import { getBlogEntry, getBlogStaticPaths } from "@web/lib/blog";
import { mdxToMarkdown } from "@web/lib/blog-markdown";
import { AUTHOR_NAME, absoluteUrl } from "@web/lib/structured-data";

export async function getStaticPaths() {
  return getBlogStaticPaths(await getCollection("blog"));
}

export const GET: APIRoute = async ({ props }) => {
  const { locale, slug } = props as { locale: string; slug: string };
  const post = getBlogEntry(await getCollection("blog"), slug, locale)!;
  const { title, description, date, tags } = post.data;

  const markdown = `# ${title}

> ${description}

- Author: ${AUTHOR_NAME}
- Published: ${date.toISOString().slice(0, 10)}
- Tags: ${tags.join(", ")}
- Canonical: ${absoluteUrl(getLocalizedPath(locale, `blog/${slug}`))}

${mdxToMarkdown(post.body ?? "")}
`;

  return new Response(markdown, {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
};
