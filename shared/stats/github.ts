import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

export const gitHubCommitStatsSchema = v.object({
  isConfigured: v.boolean(),
  username: v.string(),
  lastCommitDate: v.nullable(v.string()),
  commitsToday: nonNegativeNumber,
  commitsLast30Days: v.array(nonNegativeNumber),
  commitsLast30DayLabels: v.array(v.string()),
  commitsThisMonth: nonNegativeNumber,
  commitsThisYear: nonNegativeNumber,
  fetchedAt: nonNegativeNumber,
});
export type GitHubCommitStats = v.InferOutput<typeof gitHubCommitStatsSchema>;
