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
import { getMessages, type Locale } from "@web/i18n";

const PRIMARY_COLOR = "#8ec7ff";

export function GitHubPanel(props: { locale: Locale }) {
  const t = getMessages(props.locale);
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
        <PanelHeader
          locale={props.locale}
          title={t.telemetry.commits}
          actionUrl={latest()?.username ? `https://github.com/${latest()!.username}` : undefined}
          actionLabel={t.telemetry.profile}
        />
        <PanelSubtitle>
          <span>{t.telemetry.commitsToday(formatCount(commitsToday()))}</span>
        </PanelSubtitle>
        <PanelChart>
          <BarChart bars={bars()} color={PRIMARY_COLOR} />
        </PanelChart>
        <PanelFooter
          details={[
            { label: t.telemetry.month, value: formatCount(latest()?.commitsThisMonth ?? 0) },
            { label: t.telemetry.year, value: formatCount(latest()?.commitsThisYear ?? 0) },
          ]}
        />
      </PanelContent>
    </>
  );
}

GitHubPanel.primaryColor = PRIMARY_COLOR;
GitHubPanel.id = "github" as const;
