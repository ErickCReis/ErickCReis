import { SolidPlugin } from "@dschz/bun-plugin-solid";
import { createContent } from "fuma-content/bun";

const content = await createContent();
await content.emit({ write: true });
await Bun.plugin(content.createBunPlugin());
await Bun.plugin(SolidPlugin());
