import { createMemo } from "solid-js";
import {
  PanelTrigger,
  PanelContent,
  PanelTitle,
  PanelTrend,
  PanelSparkline,
  PanelHint,
  PanelDetails,
} from "@web/components/stat-panel";
import { githubStore } from "@web/stats/github/store";
import { formatDayRange } from "@web/stats/github/utils";
import { formatCount } from "@web/stats/utils";
import { createPanelPoints } from "@web/stats/utils";

const PRIMARY_COLOR = "#8ec7ff";
const DEFAULT_GITHUB_USER = "ErickCReis";

export function GitHubPanel() {
  const latest = createMemo(() => githubStore.latest());
  const commitsLast7Days = createMemo(() => latest()?.commitsLast7Days ?? []);
  const commitsLast7DayLabels = createMemo(() => latest()?.commitsLast7DayLabels ?? []);
  const commitsLast7DaysTotal = createMemo(() =>
    commitsLast7Days().reduce((sum, val) => sum + val, 0),
  );
  const commitsToday = createMemo(() => commitsLast7Days().at(-1) ?? 0);

  return (
    <>
      <PanelTrigger
        tag="github/7d"
        current={`${formatCount(latest()?.commitsYearToDate ?? 0)} ytd`}
      />
      <PanelContent>
        <PanelTitle
          title="Commits"
          actionUrl={latest()?.username ? `https://github.com/${latest()!.username}` : undefined}
          actionLabel="Profile"
        />
        <PanelTrend trend={`${formatCount(commitsLast7DaysTotal())} in 7d`} />
        <PanelSparkline points={createPanelPoints(commitsLast7Days(), 7)} color={PRIMARY_COLOR} />
        <PanelHint hint="GitHub commit search counts for the current year and last 7 days" />
        <PanelDetails
          details={[
            {
              label: "Year",
              value: `${latest()?.year ?? new Date().getFullYear()}`,
            },
            { label: "Today", value: formatCount(commitsToday()) },
            { label: "Range", value: formatDayRange(commitsLast7DayLabels()) },
            {
              label: "User",
              value: latest()?.username ?? DEFAULT_GITHUB_USER,
            },
          ]}
        />
      </PanelContent>
    </>
  );
}

GitHubPanel.primaryColor = PRIMARY_COLOR;
GitHubPanel.id = "github" as const;
