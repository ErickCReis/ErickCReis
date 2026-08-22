import { createMirror } from "exact-mirror";
import { setupTypebox } from "elysia";
import * as compile from "typebox/compile";
import * as schema from "typebox/schema";
import * as system from "typebox/system";
import * as type from "typebox/type";
import * as value from "typebox/value";

setupTypebox({
  exactMirror: createMirror,
  typebox: { compile, schema, system, type, value },
});

export * from "elysia";
