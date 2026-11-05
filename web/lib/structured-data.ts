export const SITE_URL = "https://erickr.dev";
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const AUTHOR_NAME = "Erick Reis";

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function siteJsonLd(description: string) {
  return [
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: SITE_URL,
      name: AUTHOR_NAME,
      description,
    },
    {
      "@type": "Person",
      "@id": PERSON_ID,
      name: AUTHOR_NAME,
      url: SITE_URL,
      jobTitle: "TypeScript Engineer",
      description,
      sameAs: ["https://github.com/ErickCReis"],
      knowsAbout: ["TypeScript", "React", "Next.js", "Astro", "SolidJS", "Bun", "Microfrontends"],
    },
  ];
}
