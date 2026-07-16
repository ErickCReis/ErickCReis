export type LabLocale = "en-US" | "pt-BR";

export function resolveLabLocale(locale: LabLocale | undefined): LabLocale {
  return locale === "pt-BR" ? "pt-BR" : "en-US";
}

export function selectLabCopy<T extends Record<LabLocale, unknown>>(
  locale: LabLocale | undefined,
  copy: T,
): T[LabLocale] {
  return copy[resolveLabLocale(locale)];
}
