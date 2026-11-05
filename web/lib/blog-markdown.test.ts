import { describe, expect, it } from "bun:test";
import { mdxToMarkdown } from "@web/lib/blog-markdown";

const july15 = new Date("2026-07-15T15:00:00.000Z");

describe("mdxToMarkdown", () => {
  it("drops ESM lines outside code fences and keeps them inside", () => {
    const body = [
      'import { isBlogPostPublished } from "@web/lib/blog-publication";',
      "",
      "Text.",
      "",
      "```ts",
      'import { x } from "./x";',
      "```",
    ].join("\n");

    expect(mdxToMarkdown(body, july15)).toBe(
      ["Text.", "", "```ts", 'import { x } from "./x";', "```"].join("\n"),
    );
  });

  it("keeps a scheduled block once its date has passed", () => {
    const body = [
      '{isBlogPostPublished(new Date("2026-07-14")) && (',
      "",
      "  <p>",
      '    Next up:{" "}',
      '    <a href="/blog/next">the next post</a>.',
      "  </p>",
      ")}",
    ].join("\n");

    expect(mdxToMarkdown(body, july15)).toBe(
      [
        "<p>",
        "Next up: ",
        '<a href="https://erickr.dev/blog/next">the next post</a>.',
        "</p>",
      ].join("\n"),
    );
  });

  it("drops a scheduled block before its date", () => {
    const body = [
      "Before.",
      "",
      '{isBlogPostPublished(new Date("2026-07-16")) && (',
      "  <p>Hidden</p>",
      ")}",
      "",
      "After.",
    ].join("\n");

    expect(mdxToMarkdown(body, july15)).toBe("Before.\n\nAfter.");
  });

  it("makes root-relative links absolute but leaves code alone", () => {
    const body = ["See [this](/blog/a).", "", "```md", "[x](/y)", "```"].join("\n");

    expect(mdxToMarkdown(body, july15)).toBe(
      ["See [this](https://erickr.dev/blog/a).", "", "```md", "[x](/y)", "```"].join("\n"),
    );
  });
});
