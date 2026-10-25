import { aot } from "elysia/plugin/aot/bun";

const SERVER_ENTRY = "./server/index.ts";
const OUTFILE = "./myserver";

const result = await Bun.build({
  entrypoints: [SERVER_ENTRY],
  target: "bun",
  jsx: { runtime: "classic" },
  compile: { outfile: OUTFILE },
  plugins: [aot(SERVER_ENTRY)],
});

if (!result.success) {
  throw new AggregateError(result.logs, `Failed to build ${OUTFILE}`);
}

console.log(`Built ${OUTFILE}`);
process.exit(0);
