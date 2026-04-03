import { t } from "virtual:translate";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import {
  PanelTrigger,
  PanelContent,
  PanelHeader,
  PanelSubtitle,
  PanelChart,
  PanelFooter,
} from "@web/components/stat-panel";
import { Sparkline } from "@web/components/sparkline";
import { websocketStore } from "@web/stats/websocket/store";
import { formatConnectionTime } from "@web/stats/websocket/utils";
import { createPanelPoints, formatCount } from "@web/stats/utils";

const PRIMARY_COLOR = "#9ccfd2";

export function WebSocketPanel() {
  const connSeries = createMemo(() => websocketStore.history().map((s) => s.connectedUsers));
  const latestUsers = createMemo(() => websocketStore.latest()?.connectedUsers ?? 0);
  const peakUsers = createMemo(() => websocketStore.latest()?.maxConcurrentUsers ?? 0);
  const connectionStartedAt = createMemo(
    () => websocketStore.latest()?.connectionStartedAt ?? null,
  );

  const [connectedMs, setConnectedMs] = createSignal(0);

  onMount(() => {
    const interval = setInterval(() => {
      const started = connectionStartedAt();
      setConnectedMs(started != null ? Date.now() - started : 0);
    }, 1000);
    onCleanup(() => clearInterval(interval));
  });

  return (
    <>
      <PanelTrigger
        tag="live"
        current={`${formatCount(latestUsers())} ${latestUsers() === 1 ? t("user") : t("users")}`}
      />
      <PanelContent>
        <PanelHeader title={t("WebSocket")} />
        <PanelSubtitle>
          <span>
            {formatCount(latestUsers())} {t("connected now")}
          </span>
        </PanelSubtitle>
        <PanelChart>
          <Sparkline points={createPanelPoints(connSeries())} color={PRIMARY_COLOR} />
        </PanelChart>
        <PanelFooter
          details={[
            { label: t("Connected"), value: formatConnectionTime(connectedMs()) },
            {
              label: t("Peak"),
              value: `${formatCount(peakUsers())} ${peakUsers() === 1 ? t("user") : t("users")}`,
            },
          ]}
        />
      </PanelContent>
    </>
  );
}

WebSocketPanel.primaryColor = PRIMARY_COLOR;
WebSocketPanel.id = "websocket" as const;
