import * as v from "valibot";

const nonNegativeNumber = v.pipe(v.number(), v.minValue(0));

export const gitHubCommitStatsSchema = v.object({
  isConfigured: v.boolean(),
  username: v.string(),
  year: v.number(),
  commitsYearToDate: nonNegativeNumber,
  commitsLast7Days: v.array(nonNegativeNumber),
  commitsLast7DayLabels: v.array(v.string()),
  fetchedAt: nonNegativeNumber,
});
export type GitHubCommitStats = v.InferOutput<typeof gitHubCommitStatsSchema>;
