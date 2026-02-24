import { createContent } from "fuma-content/bun";

const content = await createContent();
await content.emit({ write: true });
