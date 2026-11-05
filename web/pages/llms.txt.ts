import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { locales, t } from "virtual:translate";
import { getLocalizedPath } from "@web/i18n";
import { getBlogEntries } from "@web/lib/blog";
import { absoluteUrl } from "@web/lib/structured-data";

export const GET: APIRoute = async () => {
  const entries = await getCollection("blog");
  const sections = locales.map((locale) => {
    const posts = getBlogEntries(entries, locale).map(({ slug, entry }) => {
      const url = absoluteUrl(getLocalizedPath(locale, `blog/${slug}.md`));
      return `- [${entry.data.title}](${url}): ${entry.data.description}`;
    });

    return `## ${t(locale, "Blog posts")} (${locale})\n\n${posts.join("\n")}`;
  });

  const body = `# Erick Reis

> ${t("en-US", "TypeScript engineer building React and Next.js products, microfrontends, and realtime applications.")}

This is the personal site and blog of Erick Reis. The home page streams live telemetry from the server that hosts it. The blog covers how the site is built: Astro, SolidJS, Bun, realtime presence, i18n, fonts, and self-hosting. Every post is available in English and Brazilian Portuguese, and each link below points to a plain Markdown copy of the post.

${sections.join("\n\n")}

## Links

- [Home](${absoluteUrl("/")}): Profile and featured projects
- [RSS feed](${absoluteUrl("/rss.xml")}): English posts
- [RSS feed (pt-BR)](${absoluteUrl("/pt-BR/rss.xml")}): Portuguese posts
- [GitHub](https://github.com/ErickCReis): Open source projects
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
