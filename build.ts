import tailwindPlugin from "bun-plugin-tailwind";
import { createContent } from "fuma-content/bun";
import path from "node:path";

const content = await createContent();
await content.emit({ write: true });

const mdxQueryResolvePlugin: Bun.BunPlugin = {
  name: "mdx-query-resolve",
  setup(build) {
    const resolveWithQuery = (args: Bun.OnResolveArgs) => {
      const [rawPath, query] = args.path.split("?", 2);
      const resolvedPath = path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(args.resolveDir, rawPath);

      return {
        path: query ? `${resolvedPath}?${query}` : resolvedPath,
      };
    };

    build.onResolve({ filter: /\.mdx?\?.+/ }, resolveWithQuery);
  },
};

const result = await Bun.build({
  entrypoints: ["./src/server/index.ts"],
  outdir: "./dist",
  target: "bun",
  minify: true,
  plugins: [mdxQueryResolvePlugin, content.createBunPlugin(), tailwindPlugin],
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }

  process.exit(1);
}
