import { createMemo, createSignal, Show } from "solid-js";
import { ConceptLab, LabCard, LabMetric } from "@web/features/blog-series/components/concept-lab";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type CursorPoint = { x: number; y: number };
type DeliveryStatus = "waiting" | "broadcast" | "identity" | "socket" | "expired";

type CursorProtocolLabProps = {
  locale?: LabLocale;
};

const copy = {
  "en-US": {
    eyebrow: "Interactive concept lab",
    title: "Follow one cursor sample",
    description:
      "Move the local pointer and scroll offset. The local marker reacts immediately; the wire payload changes only when the 50 ms sampler runs.",
    local: "Local browser state",
    viewportX: "Viewport x",
    viewportY: "Viewport y",
    scrollY: "Document scroll y",
    documentPoint: "Document point",
    transport: "Connection and identity",
    socket: "WebSocket is open",
    identity: "Payload ID matches cookie ID",
    sample: "Run the 50 ms sample",
    expire: "Expire remote cursor after 7 s",
    lastPayload: "Last wire payload",
    remote: "Remote browser",
    noPayload: "No payload sampled yet",
    remoteEmpty: "No active remote cursor",
    cookie: "Server cookie ID",
    status: {
      waiting: "Move the controls, then sample the latest point.",
      broadcast: "Validated and broadcast. The remote marker now uses the sampled document point.",
      identity: "Dropped: the payload ID does not match the HTTP-only cookie identity.",
      socket: "Dropped: the socket is closed. Old coordinates are not queued.",
      expired: "Removed locally after seven seconds without a newer sample.",
    },
  },
  "pt-BR": {
    eyebrow: "Laboratório interativo",
    title: "Acompanhe uma amostra do cursor",
    description:
      "Mova o ponteiro local e o deslocamento da rolagem. O marcador local reage na hora; o payload só muda quando a amostragem de 50 ms acontece.",
    local: "Estado local do navegador",
    viewportX: "x na área visível",
    viewportY: "y na área visível",
    scrollY: "Rolagem y do documento",
    documentPoint: "Ponto no documento",
    transport: "Conexão e identidade",
    socket: "WebSocket está aberto",
    identity: "ID do payload corresponde ao cookie",
    sample: "Executar amostragem de 50 ms",
    expire: "Expirar cursor remoto após 7 s",
    lastPayload: "Último payload transmitido",
    remote: "Navegador remoto",
    noPayload: "Nenhum payload foi amostrado",
    remoteEmpty: "Nenhum cursor remoto ativo",
    cookie: "ID no cookie do servidor",
    status: {
      waiting: "Mova os controles e amostre o ponto mais recente.",
      broadcast:
        "Validado e transmitido. O marcador remoto agora usa o ponto amostrado no documento.",
      identity: "Descartado: o ID do payload não corresponde à identidade no cookie HTTP-only.",
      socket: "Descartado: o socket está fechado. Coordenadas antigas não entram em uma fila.",
      expired: "Removido localmente depois de sete segundos sem uma amostra mais nova.",
    },
  },
} as const;

const VIEWPORT_WIDTH = 600;
const VIEWPORT_HEIGHT = 300;
const COOKIE_ID = "cursor-a1";

export function CursorProtocolLab(props: CursorProtocolLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [viewportX, setViewportX] = createSignal(300);
  const [viewportY, setViewportY] = createSignal(140);
  const [scrollY, setScrollY] = createSignal(480);
  const [socketOpen, setSocketOpen] = createSignal(true);
  const [identityMatches, setIdentityMatches] = createSignal(true);
  const [lastPayload, setLastPayload] = createSignal<(CursorPoint & { id: string }) | null>(null);
  const [remotePoint, setRemotePoint] = createSignal<CursorPoint | null>(null);
  const [status, setStatus] = createSignal<DeliveryStatus>("waiting");

  const documentPoint = createMemo<CursorPoint>(() => ({
    x: viewportX(),
    y: viewportY() + scrollY(),
  }));

  const sampleLatestPoint = () => {
    const payload = {
      id: identityMatches() ? COOKIE_ID : "cursor-b9",
      ...documentPoint(),
    };
    setLastPayload(payload);

    if (!socketOpen()) {
      setStatus("socket");
      return;
    }

    if (payload.id !== COOKIE_ID) {
      setStatus("identity");
      return;
    }

    setRemotePoint({ x: payload.x, y: payload.y });
    setStatus("broadcast");
  };

  const expireRemote = () => {
    setRemotePoint(null);
    setStatus("expired");
  };

  return (
    <ConceptLab
      id="cursor-protocol"
      eyebrow={text().eyebrow}
      title={text().title}
      description={text().description}
    >
      <div class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <LabCard title={text().local} accent="blue">
            <div class="space-y-3">
              <div class="relative h-36 overflow-hidden rounded-lg border border-blue-200/15 bg-slate-950/60">
                <div class="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/10" />
                <div class="absolute inset-y-0 left-1/2 border-l border-dashed border-slate-200/10" />
                <span
                  class="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-100/70 bg-blue-300 shadow-lg shadow-blue-400/30 transition-[left,top]"
                  style={{
                    left: `${(viewportX() / VIEWPORT_WIDTH) * 100}%`,
                    top: `${(viewportY() / VIEWPORT_HEIGHT) * 100}%`,
                  }}
                  aria-hidden="true"
                />
              </div>

              <label class="block text-xs text-slate-300">
                <span class="flex justify-between gap-3">
                  <span>{text().viewportX}</span>
                  <output>{viewportX()} px</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max={VIEWPORT_WIDTH}
                  value={viewportX()}
                  onInput={(event) => setViewportX(event.currentTarget.valueAsNumber)}
                  class="mt-1 w-full accent-blue-400"
                />
              </label>
              <label class="block text-xs text-slate-300">
                <span class="flex justify-between gap-3">
                  <span>{text().viewportY}</span>
                  <output>{viewportY()} px</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max={VIEWPORT_HEIGHT}
                  value={viewportY()}
                  onInput={(event) => setViewportY(event.currentTarget.valueAsNumber)}
                  class="mt-1 w-full accent-blue-400"
                />
              </label>
              <label class="block text-xs text-slate-300">
                <span class="flex justify-between gap-3">
                  <span>{text().scrollY}</span>
                  <output>{scrollY()} px</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1200"
                  step="20"
                  value={scrollY()}
                  onInput={(event) => setScrollY(event.currentTarget.valueAsNumber)}
                  class="mt-1 w-full accent-blue-400"
                />
              </label>

              <LabMetric
                label={text().documentPoint}
                value={`x:${documentPoint().x} y:${documentPoint().y}`}
              />
            </div>
          </LabCard>

          <LabCard title={text().transport} accent="emerald">
            <div class="space-y-3">
              <p class="rounded-lg bg-slate-950/45 px-3 py-2 font-mono text-xs text-slate-300">
                {text().cookie}: <span class="text-emerald-200">{COOKIE_ID}</span>
              </p>
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200">
                <span>{text().socket}</span>
                <input
                  type="checkbox"
                  checked={socketOpen()}
                  onChange={(event) => setSocketOpen(event.currentTarget.checked)}
                  class="size-4 accent-emerald-400"
                />
              </label>
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200">
                <span>{text().identity}</span>
                <input
                  type="checkbox"
                  checked={identityMatches()}
                  onChange={(event) => setIdentityMatches(event.currentTarget.checked)}
                  class="size-4 accent-emerald-400"
                />
              </label>
              <button
                type="button"
                onClick={sampleLatestPoint}
                class="w-full rounded-lg border border-emerald-300/35 bg-emerald-300/10 px-3 py-2.5 text-sm text-emerald-50 transition hover:bg-emerald-300/15"
              >
                {text().sample}
              </button>

              <div class="rounded-lg border border-slate-200/10 bg-slate-950/60 p-3">
                <p class="font-mono text-xxs tracking-wide text-slate-400 uppercase">
                  {text().lastPayload}
                </p>
                <code class="mt-2 block overflow-x-auto text-xs text-slate-200">
                  {lastPayload() ? JSON.stringify(lastPayload()) : text().noPayload}
                </code>
              </div>
            </div>
          </LabCard>
        </div>

        <LabCard title={text().remote} accent="amber">
          <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div class="min-h-14 rounded-lg border border-slate-200/10 bg-slate-950/45 p-3 font-mono text-xs text-slate-300">
              <Show when={remotePoint()} fallback={<span>{text().remoteEmpty}</span>}>
                {(point) => <span>{`cursor-a1 → x:${point().x} y:${point().y}`}</span>}
              </Show>
            </div>
            <button
              type="button"
              onClick={expireRemote}
              disabled={!remotePoint()}
              class="rounded-lg border border-amber-300/25 px-3 py-2 text-xs text-amber-100 transition enabled:hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {text().expire}
            </button>
          </div>
        </LabCard>

        <p
          class="rounded-lg border border-slate-200/10 bg-slate-900/45 px-3 py-2.5 text-sm leading-relaxed text-slate-200/80"
          aria-live="polite"
        >
          {text().status[status()]}
        </p>
      </div>
    </ConceptLab>
  );
}
