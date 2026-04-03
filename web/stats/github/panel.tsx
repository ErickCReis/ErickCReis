import { t } from "virtual:translate";
import { createMemo } from "solid-js";
import {
  PanelTrigger,
  PanelContent,
  PanelHeader,
  PanelSubtitle,
  PanelChart,
  PanelFooter,
} from "@web/components/stat-panel";
import { BarChart } from "@web/components/bar-chart";
import { githubStore } from "@web/stats/github/store";
import { formatLastCommit } from "@web/stats/github/utils";
import { formatCount } from "@web/stats/utils";

const PRIMARY_COLOR = "#8ec7ff";

export function GitHubPanel() {
  const latest = createMemo(() => githubStore.latest());
  const commitsLast7Days = createMemo(() => latest()?.commitsLast7Days ?? []);
  const commitsLast7DayLabels = createMemo(() => latest()?.commitsLast7DayLabels ?? []);
  const commitsToday = createMemo(() => latest()?.commitsToday ?? 0);
  const lastCommitDate = createMemo(() => latest()?.lastCommitDate ?? null);

  const bars = createMemo(() =>
    commitsLast7Days().map((value, i) => ({
      label: commitsLast7DayLabels()[i] ?? "",
      value,
    })),
  );

  return (
    <>
      <PanelTrigger tag="github" current={formatLastCommit(lastCommitDate())} />
      <PanelContent>
        <PanelHeader title="Commits" />
        <PanelSubtitle>
          <span>
            {formatCount(commitsToday())} {t("commits today")}
          </span>
        </PanelSubtitle>
        <PanelChart>
          <BarChart bars={bars()} color={PRIMARY_COLOR} labelFontSize={6} />
        </PanelChart>
        <PanelFooter
          details={[
            { label: t("Month"), value: formatCount(latest()?.commitsThisMonth ?? 0) },
            { label: t("Year"), value: formatCount(latest()?.commitsThisYear ?? 0) },
          ]}
        />
      </PanelContent>
    </>
  );
}

GitHubPanel.primaryColor = PRIMARY_COLOR;
GitHubPanel.id = "github" as const;
