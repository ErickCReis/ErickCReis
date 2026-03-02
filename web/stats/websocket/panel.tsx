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
import { websocketStore } from "@web/stats/websocket/store";
import { formatCount } from "@web/stats/utils";
import { createPanelPoints, getLatest, getPrevious, formatSigned } from "@web/stats/utils";

const PRIMARY_COLOR = "#9ccfd2";

export function WebSocketPanel() {
  const wsSeries = createMemo(() => websocketStore.history().map((s) => s.pendingWebSockets));
  const subSeries = createMemo(() => websocketStore.history().map((s) => s.cursorSubscribers));
  const latestWs = createMemo(() => getLatest(wsSeries()));
  const previousWs = createMemo(() => getPrevious(wsSeries()));
  const latestSubs = createMemo(() => getLatest(subSeries()));

  return (
    <>
      <PanelTrigger tag="ws/subs" current={`${formatCount(latestWs())} sockets`} />
      <PanelContent>
        <PanelTitle title="WebSocket" />
        <PanelTrend trend={formatSigned(latestWs() - previousWs(), 0, " sockets")} />
        <PanelSparkline points={createPanelPoints(wsSeries())} color={PRIMARY_COLOR} />
        <PanelHint hint="Live websocket and cursor subscriber activity" />
        <PanelDetails
          details={[
            { label: "Sockets", value: formatCount(latestWs()) },
            { label: "Subs", value: formatCount(latestSubs()) },
          ]}
        />
      </PanelContent>
    </>
  );
}

WebSocketPanel.primaryColor = PRIMARY_COLOR;
WebSocketPanel.id = "websocket" as const;
