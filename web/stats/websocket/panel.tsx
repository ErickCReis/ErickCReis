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
import { getMessages, type Locale } from "@web/i18n";
import { websocketStore } from "@web/stats/websocket/store";
import { formatConnectionTime } from "@web/stats/websocket/utils";
import { createPanelPoints, formatCount } from "@web/stats/utils";

const PRIMARY_COLOR = "#9ccfd2";

export function WebSocketPanel(props: { locale: Locale }) {
  const t = getMessages(props.locale);
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
        current={t.telemetry.userCount(formatCount(latestUsers()), latestUsers())}
      />
      <PanelContent>
        <PanelHeader locale={props.locale} title={t.telemetry.websocket} />
        <PanelSubtitle>
          <span>{t.telemetry.connectedNow(formatCount(latestUsers()))}</span>
        </PanelSubtitle>
        <PanelChart>
          <Sparkline points={createPanelPoints(connSeries())} color={PRIMARY_COLOR} />
        </PanelChart>
        <PanelFooter
          details={[
            { label: t.telemetry.connected, value: formatConnectionTime(connectedMs()) },
            { label: t.telemetry.peak, value: t.telemetry.users(formatCount(peakUsers())) },
          ]}
        />
      </PanelContent>
    </>
  );
}

WebSocketPanel.primaryColor = PRIMARY_COLOR;
WebSocketPanel.id = "websocket" as const;
