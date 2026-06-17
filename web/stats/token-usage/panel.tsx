import { t } from "virtual:translate";
import { createMemo, For } from "solid-js";
import {
  PanelTrigger,
  PanelContent,
  PanelHeader,
  PanelSubtitle,
  PanelChart,
  PanelFooter,
} from "@web/components/stat-panel";
import { BarChart } from "@web/components/bar-chart";
import { tokenUsageStore } from "@web/stats/token-usage/store";
import {
  formatCompactTokenCount,
  formatTokenCount,
  formatGeneratedAt,
  getProviderMeta,
} from "@web/stats/token-usage/utils";

const PRIMARY_COLOR = "#7fb0ff";

export function TokenUsagePanel() {
  const latest = createMemo(() => tokenUsageStore.latest());
  const todayTokens = createMemo(() => latest()?.todayTokens ?? 0);
  const totalTokens30d = createMemo(() => latest()?.totalTokens30d ?? 0);
  const daily = createMemo(() => latest()?.daily ?? []);
  const providers = createMemo(() => latest()?.providers ?? []);

  const legend = createMemo(() =>
    providers().map((providerId, index) => ({ providerId, ...getProviderMeta(providerId, index) })),
  );

  const bars = createMemo(() => {
    const provs = providers();
    return daily()
      .slice(-30)
      .map((entry) => ({
        label: entry.date.slice(8),
        segments: provs.map((providerId, index) => ({
          value: entry.byProvider[index] ?? 0,
          color: getProviderMeta(providerId, index).color,
        })),
      }));
  });

  const current = createMemo(() =>
    latest() ? `${formatCompactTokenCount(todayTokens())} tokens` : t("Awaiting sync"),
  );

  return (
    <>
      <PanelTrigger tag="tokens" current={current()} />
      <PanelContent>
        <PanelHeader title={t("Token Usage")} />
        <PanelSubtitle>
          <span>
            {formatTokenCount(todayTokens())} {t("tokens today")}
          </span>
        </PanelSubtitle>
        <PanelChart>
          <BarChart bars={bars()} color={PRIMARY_COLOR} showLabels={false} />
        </PanelChart>
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <For each={legend()}>
            {(item) => (
              <span class="flex items-center gap-1 font-mono text-xxs tracking-wide text-slate-300/70 uppercase">
                <span class="size-1.5 rounded-full" style={`background-color:${item.color};`} />
                {item.label}
              </span>
            )}
          </For>
        </div>
        <PanelFooter
          details={[
            { label: t("30d total"), value: formatTokenCount(totalTokens30d()) },
            { label: t("Updated"), value: formatGeneratedAt(latest()?.generatedAt ?? null) },
          ]}
        />
      </PanelContent>
    </>
  );
}

TokenUsagePanel.primaryColor = PRIMARY_COLOR;
TokenUsagePanel.id = "tokenUsage" as const;
