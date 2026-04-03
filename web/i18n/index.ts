import type { CollectionEntry } from "astro:content";
import { defaultLocale, resolveLocale } from "virtual:translate";

export function getLocalizedPath(locale: string, path = "") {
  const normalizedLocale = resolveLocale(locale);
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");

  if (normalizedLocale === defaultLocale) {
    return normalizedPath ? `/${normalizedPath}` : "/";
  }

  return normalizedPath ? `/${normalizedLocale}/${normalizedPath}` : `/${normalizedLocale}`;
}

export type BlogEntry = CollectionEntry<"blog">;

export function getEntrySlug(entry: BlogEntry) {
  return entry.id;
}
