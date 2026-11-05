import { isBlogPostPublished } from "@web/lib/blog-publication";
import { SITE_URL } from "@web/lib/structured-data";

const SCHEDULED_BLOCK = /^\{isBlogPostPublished\(new Date\("([^"]+)"\)\) && \($/;

function absolutizeLinks(line: string) {
  return line.replace(/(\]\(|href=")\/(?!\/)/g, `$1${SITE_URL}/`);
}

export function mdxToMarkdown(body: string, now = new Date()) {
  const output: string[] = [];
  let fence: string | undefined;
  // Inside an isBlogPostPublished(...) block: whether it renders.
  let scheduled: boolean | undefined;

  for (const line of body.split("\n")) {
    const marker = line.match(/^\s*(```+|~~~+)/)?.[1];

    if (fence || marker) {
      if (!fence) fence = marker;
      else if (marker?.startsWith(fence)) fence = undefined;
      if (scheduled !== false) output.push(line);
    } else if (scheduled !== undefined) {
      if (line.trim() === ")}") scheduled = undefined;
      else if (scheduled) output.push(absolutizeLinks(line.trim().replaceAll('{" "}', " ")));
    } else {
      const date = line.match(SCHEDULED_BLOCK)?.[1];
      if (date) scheduled = isBlogPostPublished(new Date(date), now);
      else if (!/^(import|export)\s/.test(line)) output.push(absolutizeLinks(line));
    }
  }

  return output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
