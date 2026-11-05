import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { defaultLocale, locales, t, type Locale } from "virtual:translate";
import { getLocalizedPath } from "@web/i18n";
import { getBlogEntries } from "@web/lib/blog";
import { absoluteUrl } from "@web/lib/structured-data";

export function getStaticPaths() {
  return locales.map((locale) => ({
    params: { locale: locale === defaultLocale ? undefined : locale },
    props: { locale },
  }));
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export const GET: APIRoute = async ({ props }) => {
  const { locale } = props as { locale: Locale };
  const posts = getBlogEntries(await getCollection("blog"), locale);

  const items = posts.map(({ slug, entry }) => {
    const url = absoluteUrl(getLocalizedPath(locale, `blog/${slug}`));
    return `<item>
<title>${escapeXml(entry.data.title)}</title>
<link>${url}</link>
<guid>${url}</guid>
<description>${escapeXml(entry.data.description)}</description>
<pubDate>${entry.data.date.toUTCString()}</pubDate>
${entry.data.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}
</item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(t(locale, "Blog | Erick Reis"))}</title>
<link>${absoluteUrl(getLocalizedPath(locale, "blog"))}</link>
<description>${escapeXml(t(locale, "Notes on frontend engineering, systems work, and the decisions behind the build."))}</description>
<language>${locale}</language>
<atom:link href="${absoluteUrl(getLocalizedPath(locale, "rss.xml"))}" rel="self" type="application/rss+xml"/>
${items.join("\n")}
</channel>
</rss>
`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
};
