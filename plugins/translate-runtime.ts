export type TranslationCatalog = Record<string, string | null>;
export type ClientCatalog = Record<string, string>;
export type LocaleCatalogs = Record<string, TranslationCatalog>;
export type LocaleClientCatalogs = Record<string, ClientCatalog>;

export function hashTranslationKey(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).padStart(7, "0");
}

type TranslateRuntimeConfig = {
  locales: readonly string[];
  defaultLocale: string;
  buildCatalogs: LocaleCatalogs;
  clientCatalogs: LocaleClientCatalogs;
};

export function createTranslateRuntime({
  locales,
  defaultLocale,
  buildCatalogs,
  clientCatalogs,
}: TranslateRuntimeConfig) {
  function resolveLocale(value?: string | null): string {
    return typeof value === "string" && locales.includes(value) ? value : defaultLocale;
  }

  function getPathLocale(pathname = "/"): string {
    if (typeof pathname !== "string" || pathname.length === 0) {
      return defaultLocale;
    }

    const [firstSegment] = pathname.replace(/^\/+/, "").split("/");
    return resolveLocale(firstSegment);
  }

  function getClientCatalog(locale: string): ClientCatalog {
    if (locale === defaultLocale) {
      return {};
    }

    return clientCatalogs[locale] ?? {};
  }

  function translateForBrowser(locale: string, value: string): string {
    const normalizedLocale = resolveLocale(locale);
    if (normalizedLocale === defaultLocale) {
      return value;
    }

    return getClientCatalog(normalizedLocale)[hashTranslationKey(value)] ?? value;
  }

  function translateForBuild(locale: string, value: string): string {
    const normalizedLocale = resolveLocale(locale);
    if (normalizedLocale === defaultLocale) {
      return value;
    }

    return buildCatalogs[normalizedLocale]?.[hashTranslationKey(value)] ?? value;
  }

  function getLocale(): string {
    if (typeof window === "undefined") {
      return defaultLocale;
    }

    return resolveLocale(document.documentElement.lang || getPathLocale(window.location.pathname));
  }

  function t(localeOrValue: string, maybeValue?: string): string {
    if (typeof maybeValue === "string") {
      return typeof window === "undefined"
        ? translateForBuild(localeOrValue, maybeValue)
        : translateForBrowser(localeOrValue, maybeValue);
    }

    return typeof window === "undefined"
      ? localeOrValue
      : translateForBrowser(getLocale(), localeOrValue);
  }

  return {
    locales,
    defaultLocale,
    resolveLocale,
    getPathLocale,
    getLocale,
    t,
  };
}
