import type { CollectionEntry } from "astro:content";
import { defaultLocale, locales, resolveLocale } from "virtual:translate";
import { filterPublishedEntries } from "@web/lib/blog-publication";

export type BlogEntry = CollectionEntry<"blog">;
export type BlogVisibilityOptions = {
  includeScheduled?: boolean;
  now?: Date;
};

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

export function getBlogEntry(
  entries: readonly BlogEntry[],
  slug: string,
  locale: string,
  options: BlogVisibilityOptions = {},
) {
  const normalizedLocale = resolveLocale(locale);
  const visibleEntries = filterPublishedEntries(entries, options);

  return (
    visibleEntries.find((entry) => getSourceName(entry) === `${slug}.${normalizedLocale}`) ??
    visibleEntries.find((entry) => getSourceName(entry) === slug)
  );
}

export function getBlogEntries(
  entries: readonly BlogEntry[],
  locale: string,
  options: BlogVisibilityOptions = {},
) {
  const normalizedLocale = resolveLocale(locale);
  const postsBySlug = new Map<string, BlogEntry>();

  for (const entry of filterPublishedEntries(entries, options)) {
    const slug = getBlogSlug(entry);

    if (!postsBySlug.has(slug) || getSourceName(entry) === `${slug}.${normalizedLocale}`) {
      postsBySlug.set(slug, entry);
    }
  }

  return [...postsBySlug.entries()].map(([slug, entry]) => ({ slug, entry }));
}

export function getBlogStaticPaths(
  entries: readonly BlogEntry[],
  options: BlogVisibilityOptions = {},
) {
  const slugs = [...new Set(filterPublishedEntries(entries, options).map(getBlogSlug))];

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
