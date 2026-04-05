import type { CollectionEntry } from "astro:content";
import { defaultLocale, locales, resolveLocale } from "virtual:translate";

export type BlogEntry = CollectionEntry<"blog">;

const localeSuffixes = locales
  .filter((locale) => locale !== defaultLocale)
  .sort((left, right) => right.length - left.length)
  .map((locale) => `.${locale}`);

function getSourceName(entry: BlogEntry) {
  return ((entry.filePath ?? entry.id).split("/").at(-1) ?? entry.id).replace(/\.(md|mdx)$/i, "");
}

export function getBlogSlug(entry: BlogEntry) {
  const sourceName = getSourceName(entry);

  for (const suffix of localeSuffixes) {
    if (sourceName.endsWith(suffix)) {
      return sourceName.slice(0, -suffix.length);
    }
  }

  return sourceName;
}

export function getBlogViewKey(entry: BlogEntry) {
  return getSourceName(entry);
}

export function getBlogEntry(entries: readonly BlogEntry[], slug: string, locale: string) {
  const normalizedLocale = resolveLocale(locale);

  return (
    entries.find((entry) => getSourceName(entry) === `${slug}.${normalizedLocale}`) ??
    entries.find((entry) => getSourceName(entry) === slug)
  );
}

export function getBlogEntries(entries: readonly BlogEntry[], locale: string) {
  const normalizedLocale = resolveLocale(locale);
  const postsBySlug = new Map<string, BlogEntry>();

  for (const entry of entries) {
    const slug = getBlogSlug(entry);

    if (!postsBySlug.has(slug) || getSourceName(entry) === `${slug}.${normalizedLocale}`) {
      postsBySlug.set(slug, entry);
    }
  }

  return [...postsBySlug.entries()].map(([slug, entry]) => ({ slug, entry }));
}

export function getBlogStaticPaths(entries: readonly BlogEntry[]) {
  const slugs = [...new Set(entries.map(getBlogSlug))];

  return locales.flatMap((locale) =>
    slugs.map((slug) => ({
      params: {
        locale: locale === defaultLocale ? undefined : locale,
        slug,
      },
      props: {
        locale,
        slug,
      },
    })),
  );
}
