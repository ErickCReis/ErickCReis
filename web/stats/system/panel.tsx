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
import { systemStore } from "@web/stats/system/store";
import { formatPercent, formatMemory } from "@web/stats/system/utils";
import { createPanelPoints, getLatest, getPrevious, formatSigned } from "@web/stats/utils";

const PRIMARY_COLOR = "#f1c18b";

export function SystemPanel() {
  const cpuSeries = createMemo(() => systemStore.history().map((s) => s.cpuUsagePercent));
  const latestCpu = createMemo(() => getLatest(cpuSeries()));
  const previousCpu = createMemo(() => getPrevious(cpuSeries()));
  const latestHeap = createMemo(() => {
    const h = systemStore.history();
    return h.length > 0 ? h[h.length - 1].memoryHeapUsedMb : 0;
  });
  const latestMemPercent = createMemo(() => systemStore.latest()?.systemMemoryUsedPercent ?? 0);

  return (
    <>
      <PanelTrigger tag="cpu/mem" current={`${formatPercent(latestCpu())} cpu`} />
      <PanelContent>
        <PanelTitle title="System" />
        <PanelTrend trend={formatSigned(latestCpu() - previousCpu(), 1, "%")} />
        <PanelSparkline points={createPanelPoints(cpuSeries())} color={PRIMARY_COLOR} />
        <PanelHint hint="Live runtime usage from the current server process" />
        <PanelDetails
          details={[
            { label: "CPU", value: formatPercent(latestCpu()) },
            { label: "Heap", value: formatMemory(latestHeap()) },
            { label: "Memory", value: formatPercent(latestMemPercent()) },
          ]}
        />
      </PanelContent>
    </>
  );
}

SystemPanel.primaryColor = PRIMARY_COLOR;
SystemPanel.id = "system" as const;
