export const BLOG_PUBLICATION_TIME_ZONE = "America/Sao_Paulo";

type DatedEntry = {
  data: {
    date: Date;
  };
};

type PublicationVisibilityOptions = {
  includeScheduled?: boolean;
  now?: Date;
};

const publicationDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: BLOG_PUBLICATION_TIME_ZONE,
  year: "numeric",
});

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function getPublicationDateKey(now: Date) {
  const parts = publicationDateFormatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to resolve the current date in ${BLOG_PUBLICATION_TIME_ZONE}.`);
  }

  return `${year}-${month}-${day}`;
}

export function getScheduledDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
  ].join("-");
}

export function isBlogPostPublished(date: Date, now = new Date()) {
  return getScheduledDateKey(date) <= getPublicationDateKey(now);
}

export function filterPublishedEntries<T extends DatedEntry>(
  entries: readonly T[],
  { includeScheduled = false, now = new Date() }: PublicationVisibilityOptions = {},
) {
  if (includeScheduled) {
    return entries;
  }

  return entries.filter((entry) => isBlogPostPublished(entry.data.date, now));
}
