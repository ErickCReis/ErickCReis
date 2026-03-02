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
import { codexStore } from "@web/stats/codex/store";
import {
  formatTokenCount,
  formatCompactTokenCount,
  formatGeneratedAt,
} from "@web/stats/codex/utils";
import { createPanelPoints } from "@web/stats/utils";

const PRIMARY_COLOR = "#7fb0ff";
const DEFAULT_CODEX_STATUS = "Awaiting sync";

export function CodexPanel() {
  const latest = createMemo(() => codexStore.latest());
  const codexLatestDay = createMemo(() => latest()?.latestDay);
  const codexDaily = createMemo(() => latest()?.daily ?? []);
  const codexTotals = createMemo(() => latest()?.totals);
  const dailyTokenPoints = createMemo(() => codexDaily().map((e) => e.totalTokens));

  const hint = createMemo(() => {
    if (!codexLatestDay()) return "Awaiting first hourly sync from local machine";
    if (latest()?.isStale) return "Sync stale: no successful update in the configured stale window";
    return "Hourly token usage sync from local machine";
  });

  const current = createMemo(() =>
    codexLatestDay()
      ? `${formatCompactTokenCount(codexLatestDay()!.totalTokens)} tokens`
      : DEFAULT_CODEX_STATUS,
  );

  const details = createMemo(() => {
    const day = codexLatestDay();
    if (!day) {
      return [
        { label: "Status", value: DEFAULT_CODEX_STATUS },
        { label: "Updated", value: formatGeneratedAt(latest()?.generatedAt ?? null) },
      ];
    }
    return [
      { label: "Input", value: formatTokenCount(day.inputTokens) },
      { label: "Cached", value: formatTokenCount(day.cachedInputTokens) },
      { label: "Output", value: formatTokenCount(day.outputTokens) },
      { label: "Reasoning", value: formatTokenCount(day.reasoningOutputTokens) },
      {
        label: "30d total",
        value: formatTokenCount(codexTotals()?.totalTokens ?? day.totalTokens),
      },
      { label: "Updated", value: formatGeneratedAt(latest()?.generatedAt ?? null) },
    ];
  });

  return (
    <>
      <PanelTrigger tag="codex/daily" current={current()} />
      <PanelContent>
        <PanelTitle title="Codex Usage" />
        <PanelTrend trend="--" />
        <PanelSparkline points={createPanelPoints(dailyTokenPoints(), 30)} color={PRIMARY_COLOR} />
        <PanelHint hint={hint()} />
        <PanelDetails details={details()} />
      </PanelContent>
    </>
  );
}

CodexPanel.primaryColor = PRIMARY_COLOR;
CodexPanel.id = "codex" as const;
