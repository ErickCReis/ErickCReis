import { Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type CursorProtocolLabProps = { locale?: LabLocale };
type Point = { x: number; y: number };
type RemotePoint = Point & { documentX: number; documentY: number; sequence: number };
type State = "live" | "socket" | "identity" | "expired";

const copy = {
  "en-US": {
    label: "Cursor protocol workbench",
    local: "local viewport",
    remote: "remote document",
    move: "Move or drag here. With keyboard focus, use the arrow keys; press Home to recenter.",
    hint: "move · drag · arrow keys",
    document: "document",
    scroll: "scroll Y",
    position: "document position",
    packet: "position packet",
    connection: { open: "open", closed: "closed" },
    stages: {
      sample: "sample",
      socket: "socket",
      identity: "identity",
      peer: "peer",
    },
    socket: "WS open",
    identity: "ID matches",
    expire: "skip 7 s",
    sequence: "sample",
    you: "you",
    peer: "peer",
    waiting: "waiting for a valid position",
    states: {
      live: "accepted · broadcast to peers",
      socket: "dropped · socket is closed",
      identity: "rejected · connection ID differs",
      expired: "removed · no update for 7 seconds",
    },
  },
  "pt-BR": {
    label: "Bancada do protocolo de cursores",
    local: "área visível local",
    remote: "documento remoto",
    move: "Mova ou arraste aqui. Com o foco do teclado, use as setas; pressione Home para centralizar.",
    hint: "mova · arraste · use as setas",
    document: "documento",
    scroll: "rolagem Y",
    position: "posição no documento",
    packet: "pacote de posição",
    connection: { open: "aberto", closed: "fechado" },
    stages: {
      sample: "amostra",
      socket: "socket",
      identity: "identidade",
      peer: "par",
    },
    socket: "WS aberto",
    identity: "ID confere",
    expire: "avançar 7 s",
    sequence: "amostra",
    you: "você",
    peer: "par",
    waiting: "aguardando uma posição válida",
    states: {
      live: "aceito · transmitido aos pares",
      socket: "descartado · o socket está fechado",
      identity: "rejeitado · o ID da conexão é diferente",
      expired: "removido · sem atualização por 7 segundos",
    },
  },
} as const;

const DOCUMENT_WIDTH = 600;
const DOCUMENT_HEIGHT = 1440;
const VIEWPORT_HEIGHT = 240;
const KEYBOARD_STEP = 4;

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function CursorProtocolLab(props: CursorProtocolLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [local, setLocal] = createSignal<Point>({ x: 34, y: 42 });
  const [remote, setRemote] = createSignal<RemotePoint>();
  const [scrollY, setScrollY] = createSignal(480);
  const [socketOpen, setSocketOpen] = createSignal(true);
  const [identityMatches, setIdentityMatches] = createSignal(true);
  const [active, setActive] = createSignal(true);
  const [state, setState] = createSignal<State>("live");
  const [sequence, setSequence] = createSignal(0);
  let hasPendingSample = true;

  const documentPoint = createMemo(() => ({
    x: Math.round((local().x / 100) * DOCUMENT_WIDTH),
    y: Math.round((local().y / 100) * VIEWPORT_HEIGHT + scrollY()),
  }));
  const remoteTop = createMemo(() =>
    remote() ? clamp((remote()!.documentY / DOCUMENT_HEIGHT) * 100) : 0,
  );
  const remoteLeft = createMemo(() =>
    remote() ? clamp((remote()!.documentX / DOCUMENT_WIDTH) * 100) : 0,
  );

  function queueSample(point?: Point) {
    if (point) setLocal(point);
    hasPendingSample = true;
    setActive(true);
  }

  onMount(() => {
    const timer = window.setInterval(() => {
      if (!active() || !hasPendingSample) return;

      hasPendingSample = false;
      const nextSequence = sequence() + 1;
      setSequence(nextSequence);

      if (!socketOpen()) {
        setState("socket");
        return;
      }
      if (!identityMatches()) {
        setState("identity");
        return;
      }

      setRemote({
        ...local(),
        documentX: documentPoint().x,
        documentY: documentPoint().y,
        sequence: nextSequence,
      });
      setState("live");
    }, 50);
    onCleanup(() => window.clearInterval(timer));
  });

  function pointFromPointer(event: PointerEvent & { currentTarget: HTMLDivElement }) {
    const bounds = event.currentTarget.getBoundingClientRect();
    queueSample({
      x: clamp(((event.clientX - bounds.left) / bounds.width) * 100),
      y: clamp(((event.clientY - bounds.top) / bounds.height) * 100),
    });
  }

  function moveWithKeyboard(event: KeyboardEvent) {
    const offsets: Partial<Record<string, Point>> = {
      ArrowLeft: { x: -KEYBOARD_STEP, y: 0 },
      ArrowRight: { x: KEYBOARD_STEP, y: 0 },
      ArrowUp: { x: 0, y: -KEYBOARD_STEP },
      ArrowDown: { x: 0, y: KEYBOARD_STEP },
    };

    if (event.key === "Home") {
      event.preventDefault();
      queueSample({ x: 50, y: 50 });
      return;
    }

    const offset = offsets[event.key];
    if (!offset) return;

    event.preventDefault();
    queueSample({ x: clamp(local().x + offset.x), y: clamp(local().y + offset.y) });
  }

  function toggleSocket() {
    const next = !socketOpen();
    setSocketOpen(next);
    if (!next) setState("socket");
    queueSample();
  }

  function toggleIdentity() {
    const next = !identityMatches();
    setIdentityMatches(next);
    if (!next) setState("identity");
    queueSample();
  }

  function expireRemote() {
    setActive(false);
    hasPendingSample = false;
    setRemote(undefined);
    setState("expired");
  }

  return (
    <LabFrame id="cursor-protocol" label={text().label} class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-[1.35rem] border border-violet-300/15 bg-[#090716] shadow-xl shadow-violet-950/25">
        <div class="grid gap-px bg-violet-200/10 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <div class="min-w-0 bg-[#0b091b] p-2.5">
            <div class="mb-2 flex items-center justify-between gap-3 font-mono text-[9px] tracking-[0.14em] uppercase">
              <span class="text-blue-200/70">01 · {text().local}</span>
              <span class="truncate text-slate-600">viewport + scrollY</span>
            </div>

            <div
              class="group relative h-52 touch-none overflow-hidden rounded-xl border border-blue-200/10 bg-[#080d1b] outline-none focus-visible:border-blue-300/60 focus-visible:ring-2 focus-visible:ring-blue-300/25"
              style={{
                "background-image":
                  "linear-gradient(rgba(125,211,252,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.055) 1px, transparent 1px)",
                "background-position-y": `${-(scrollY() % 24)}px`,
                "background-size": "24px 24px",
              }}
              onPointerDown={(event) => {
                event.currentTarget.focus();
                event.currentTarget.setPointerCapture(event.pointerId);
                pointFromPointer(event);
              }}
              onPointerMove={(event) => {
                if (
                  event.pointerType === "mouse" ||
                  event.currentTarget.hasPointerCapture(event.pointerId)
                ) {
                  pointFromPointer(event);
                }
              }}
              onKeyDown={moveWithKeyboard}
              tabIndex={0}
              role="group"
              aria-label={text().move}
            >
              <span class="pointer-events-none absolute top-3 left-3 font-mono text-[8px] tracking-[0.16em] text-slate-600 uppercase transition-colors group-focus-visible:text-blue-200/65 motion-reduce:transition-none">
                {text().hint}
              </span>

              <div
                class="pointer-events-none absolute inset-x-8 top-14 space-y-5 opacity-35 transition-transform duration-150 motion-reduce:transition-none"
                style={{ transform: `translateY(-${scrollY() % 40}px)` }}
                aria-hidden="true"
              >
                <span class="block h-1.5 w-3/5 rounded-full bg-slate-400/30" />
                <span class="block h-1.5 w-4/5 rounded-full bg-slate-400/20" />
                <span class="block h-1.5 w-2/5 rounded-full bg-slate-400/25" />
                <span class="block h-1.5 w-3/4 rounded-full bg-slate-400/15" />
              </div>

              <span class="pointer-events-none absolute top-2 right-2 rounded-md border border-slate-200/10 bg-slate-950/75 px-1.5 py-1 font-mono text-[8px] text-slate-500">
                +{scrollY()}px
              </span>
              <span
                class="pointer-events-none absolute z-20 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950 bg-blue-300 shadow-[0_0_0_3px_rgba(125,211,252,0.16),0_0_18px_rgba(125,211,252,0.55)]"
                style={{ left: `${local().x}%`, top: `${local().y}%` }}
              >
                <span class="absolute top-2 left-2 rounded bg-blue-200 px-1 py-0.5 font-mono text-[8px] font-semibold text-slate-950">
                  {text().you}
                </span>
              </span>

              <code class="pointer-events-none absolute right-2 bottom-2 rounded-md border border-blue-200/10 bg-slate-950/80 px-2 py-1 font-mono text-[9px] text-blue-100/80">
                {text().position} · {documentPoint().x},{documentPoint().y}
              </code>
            </div>
          </div>

          <div class="flex min-h-52 flex-col bg-[#0d0a1d] p-2.5 sm:min-h-0">
            <div class="mb-2 flex items-center justify-between gap-2 font-mono text-[9px] tracking-[0.14em] uppercase">
              <span class="text-violet-200/70">02 · {text().remote}</span>
              <span class="text-slate-700">1440px</span>
            </div>

            <div class="relative min-h-44 flex-1 overflow-hidden rounded-lg border border-violet-200/10 bg-[linear-gradient(180deg,rgba(139,92,246,0.08),transparent_35%,rgba(59,130,246,0.05))]">
              <div
                class="pointer-events-none absolute inset-x-4 inset-y-3 flex flex-col justify-between opacity-60"
                aria-hidden="true"
              >
                <span class="h-px bg-violet-200/10" />
                <span class="h-px bg-violet-200/10" />
                <span class="h-px bg-violet-200/10" />
                <span class="h-px bg-violet-200/10" />
                <span class="h-px bg-violet-200/10" />
              </div>
              <span class="absolute top-2 left-2 font-mono text-[8px] tracking-wider text-slate-700 uppercase">
                {text().document}
              </span>

              <Show
                when={remote()}
                fallback={
                  <span class="absolute inset-x-3 top-1/2 -translate-y-1/2 text-center font-mono text-[8px] leading-relaxed text-slate-600">
                    {text().waiting}
                  </span>
                }
              >
                <span
                  class="pointer-events-none absolute z-10 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] border border-violet-100 bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.65)] transition-[left,top] duration-100 motion-reduce:transition-none"
                  style={{ left: `${remoteLeft()}%`, top: `${remoteTop()}%` }}
                >
                  <span class="absolute top-2 left-2 -rotate-45 rounded bg-violet-200 px-1 py-0.5 font-mono text-[8px] font-semibold text-slate-950">
                    {text().peer}
                  </span>
                </span>
              </Show>
            </div>
          </div>
        </div>

        <div class="border-t border-violet-200/10 bg-slate-950/45 px-3 py-2.5">
          <div class="mb-2 flex items-center justify-between gap-2 font-mono text-[8px] tracking-[0.13em] uppercase">
            <span class="text-slate-500">{text().packet}</span>
            <code class="truncate text-right normal-case text-slate-400">
              #{String(sequence()).padStart(2, "0")}{" "}
              {`{id:"a3f2", x:${documentPoint().x}, y:${documentPoint().y}}`}
            </code>
          </div>

          <ol class="grid grid-cols-4 gap-1" aria-label={text().packet}>
            <li class="rounded-md border border-blue-300/15 bg-blue-300/5 px-1.5 py-1.5 text-center font-mono">
              <span class="block text-[8px] text-slate-600">01</span>
              <span class="block text-[9px] text-blue-200">{text().stages.sample}</span>
              <span class="block text-[8px] text-slate-600">50 ms</span>
            </li>
            <li
              class={`rounded-md border px-1.5 py-1.5 text-center font-mono transition-colors motion-reduce:transition-none ${
                socketOpen()
                  ? "border-blue-300/15 bg-blue-300/5"
                  : "border-rose-300/25 bg-rose-300/5"
              }`}
            >
              <span class="block text-[8px] text-slate-600">02</span>
              <span
                class={
                  socketOpen() ? "block text-[9px] text-blue-200" : "block text-[9px] text-rose-200"
                }
              >
                {text().stages.socket}
              </span>
              <span class="block text-[8px] text-slate-600">
                {socketOpen() ? text().connection.open : text().connection.closed}
              </span>
            </li>
            <li
              class={`rounded-md border px-1.5 py-1.5 text-center font-mono transition-colors motion-reduce:transition-none ${
                identityMatches()
                  ? "border-violet-300/15 bg-violet-300/5"
                  : "border-rose-300/25 bg-rose-300/5"
              }`}
            >
              <span class="block text-[8px] text-slate-600">03</span>
              <span
                class={
                  identityMatches()
                    ? "block text-[9px] text-violet-200"
                    : "block text-[9px] text-rose-200"
                }
              >
                {text().stages.identity}
              </span>
              <span class="block text-[8px] text-slate-600">
                {identityMatches() ? "id = id" : "id ≠ id"}
              </span>
            </li>
            <li
              class={`rounded-md border px-1.5 py-1.5 text-center font-mono transition-colors motion-reduce:transition-none ${
                state() === "live"
                  ? "border-emerald-300/20 bg-emerald-300/5"
                  : "border-slate-200/10 bg-slate-200/[0.02]"
              }`}
            >
              <span class="block text-[8px] text-slate-600">04</span>
              <span
                class={
                  state() === "live"
                    ? "block text-[9px] text-emerald-200"
                    : "block text-[9px] text-slate-500"
                }
              >
                {text().stages.peer}
              </span>
              <span class="block text-[8px] text-slate-600">
                {remote() ? `#${String(remote()!.sequence).padStart(2, "0")}` : "—"}
              </span>
            </li>
          </ol>
        </div>

        <div class="grid gap-2 border-t border-violet-200/10 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <label class="flex min-w-0 items-center gap-2 font-mono text-[9px] text-slate-500">
            <span class="shrink-0">{text().scroll}</span>
            <input
              type="range"
              min="0"
              max="1200"
              step="40"
              value={scrollY()}
              onInput={(event) => {
                setScrollY(event.currentTarget.valueAsNumber);
                queueSample();
              }}
              class="min-w-20 flex-1 accent-violet-400"
            />
            <output class="w-10 text-right text-slate-300">{scrollY()}</output>
          </label>

          <div class="grid grid-cols-3 gap-1" role="group" aria-label={text().label}>
            <button
              type="button"
              onClick={toggleSocket}
              aria-pressed={socketOpen()}
              class={`rounded-md border px-2 py-1.5 font-mono text-[9px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 motion-reduce:transition-none ${
                socketOpen()
                  ? "border-blue-300/20 bg-blue-300/10 text-blue-100"
                  : "border-rose-300/20 bg-rose-300/5 text-rose-200"
              }`}
            >
              <span aria-hidden="true">{socketOpen() ? "●" : "○"}</span> {text().socket}
            </button>
            <button
              type="button"
              onClick={toggleIdentity}
              aria-pressed={identityMatches()}
              class={`rounded-md border px-2 py-1.5 font-mono text-[9px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 motion-reduce:transition-none ${
                identityMatches()
                  ? "border-violet-300/20 bg-violet-300/10 text-violet-100"
                  : "border-rose-300/20 bg-rose-300/5 text-rose-200"
              }`}
            >
              <span aria-hidden="true">{identityMatches() ? "●" : "○"}</span> {text().identity}
            </button>
            <button
              type="button"
              onClick={expireRemote}
              class="rounded-md border border-slate-200/10 bg-slate-800/60 px-2 py-1.5 font-mono text-[9px] text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 motion-reduce:transition-none"
            >
              {text().expire}
            </button>
          </div>
        </div>

        <div
          class="flex items-center gap-2 border-t border-violet-200/10 px-3 py-2.5 font-mono text-[9px] text-slate-400"
          aria-live="polite"
        >
          <span
            class={`size-1.5 shrink-0 rounded-full ${
              state() === "live" ? "bg-emerald-300 motion-safe:animate-pulse" : "bg-rose-300"
            }`}
          />
          <span>{text().states[state()]}</span>
          <span class="ml-auto hidden text-slate-700 sm:inline">
            {text().sequence} #{String(sequence()).padStart(2, "0")}
          </span>
        </div>
      </div>
    </LabFrame>
  );
}
