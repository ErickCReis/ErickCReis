import { defaultLocale, resolveLocale } from "virtual:translate";

export function getLocalizedPath(locale: string, path = "") {
  const normalizedLocale = resolveLocale(locale);
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");

  if (normalizedLocale === defaultLocale) {
    return normalizedPath ? `/${normalizedPath}` : "/";
  }

  return normalizedPath ? `/${normalizedLocale}/${normalizedPath}` : `/${normalizedLocale}`;
}
