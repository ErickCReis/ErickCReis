import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

export const serverInfoStatSchema = v.object({
  timestamp: nonNegativeNumber,
  appVersion: v.string(),
  uptimeSeconds: nonNegativeNumber,
});
export type ServerInfoStat = v.InferOutput<typeof serverInfoStatSchema>;
