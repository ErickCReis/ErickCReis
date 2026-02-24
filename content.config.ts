import { mdxCollection } from "fuma-content/collections/mdx";
import { defineConfig } from "fuma-content/config";
import { z } from "zod";

export default defineConfig({
  collections: {
    blog: mdxCollection({
      dir: "content/blog",
      options: {
        jsxImportSource: "react",
      },
      frontmatter: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
      }),
    }),
  },
});
