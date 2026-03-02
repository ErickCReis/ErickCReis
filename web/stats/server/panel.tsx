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
import { serverStore } from "@web/stats/server/store";
import { formatUptime } from "@web/stats/server/utils";
import { createPanelPoints } from "@web/stats/utils";

const PRIMARY_COLOR = "#8edec9";
const DEFAULT_VERSION = "v0.0.0";

export function ServerPanel() {
  const uptimeMinutes = createMemo(() => serverStore.history().map((s) => s.uptimeSeconds / 60));
  const latestUptime = createMemo(() => {
    const vals = uptimeMinutes();
    return vals.length > 0 ? vals[vals.length - 1] : 0;
  });
  const latestVersion = createMemo(() => serverStore.latest()?.appVersion ?? DEFAULT_VERSION);

  return (
    <>
      <PanelTrigger tag="uptime/ver" current={formatUptime(latestUptime())} />
      <PanelContent>
        <PanelTitle title="Server" />
        <PanelTrend trend={latestVersion()} />
        <PanelSparkline points={createPanelPoints(uptimeMinutes())} color={PRIMARY_COLOR} />
        <PanelHint hint="Server identity and uptime lifecycle" />
        <PanelDetails
          details={[
            { label: "Uptime", value: formatUptime(latestUptime()) },
            { label: "Version", value: latestVersion() },
          ]}
        />
      </PanelContent>
    </>
  );
}

ServerPanel.primaryColor = PRIMARY_COLOR;
ServerPanel.id = "server" as const;
