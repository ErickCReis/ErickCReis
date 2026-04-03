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
import { DualSparkline } from "@web/components/dual-sparkline";
import { systemStore } from "@web/stats/system/store";
import { formatPercent } from "@web/stats/system/utils";
import { createPanelPoints } from "@web/stats/utils";

const PRIMARY_COLOR = "#f1c18b";
const SECONDARY_COLOR = "#9ccfd2";

export function SystemPanel() {
  const cpuSeries = createMemo(() => systemStore.history().map((s) => s.cpuUsagePercent));
  const memorySeries = createMemo(() =>
    systemStore.history().map((s) => s.systemMemoryUsedPercent),
  );
  const latestCpu = createMemo(() => systemStore.latest()?.cpuUsagePercent ?? 0);
  const latestMemPercent = createMemo(() => systemStore.latest()?.systemMemoryUsedPercent ?? 0);
  const cpuCount = createMemo(() => systemStore.latest()?.cpuCount ?? 0);
  const totalMemGb = createMemo(() => {
    const mb = systemStore.latest()?.totalMemoryMb ?? 0;
    return `${(mb / 1024).toFixed(0)} GB`;
  });
  const battery = createMemo(() => {
    const latest = systemStore.latest();
    if (!latest || latest.batteryPercent == null) return "n/a";
    const status = latest.batteryStatus ? ` (${latest.batteryStatus})` : "";
    return `${latest.batteryPercent.toFixed(0)}%${status}`;
  });

  return (
    <>
      <PanelTrigger tag="cpu" current={formatPercent(latestCpu())} />
      <PanelContent>
        <PanelHeader title={t("System")} />
        <PanelSubtitle>
          <div class="flex justify-between">
            <span>CPU {formatPercent(latestCpu())}</span>
            <span>Mem {formatPercent(latestMemPercent())}</span>
          </div>
        </PanelSubtitle>
        <PanelChart>
          <DualSparkline
            primaryPoints={createPanelPoints(cpuSeries())}
            secondaryPoints={createPanelPoints(memorySeries())}
            primaryColor={PRIMARY_COLOR}
            secondaryColor={SECONDARY_COLOR}
            primaryMax={100}
            secondaryMax={100}
          />
        </PanelChart>
        <PanelFooter
          details={[
            { label: "vCPUs", value: `${cpuCount()}` },
            { label: "RAM", value: totalMemGb() },
            { label: t("Battery"), value: battery() },
          ]}
        />
      </PanelContent>
    </>
  );
}

SystemPanel.primaryColor = PRIMARY_COLOR;
SystemPanel.id = "system" as const;
