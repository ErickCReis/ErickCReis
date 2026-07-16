import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type CursorProtocolLabProps = { locale?: LabLocale };
type Point = { x: number; y: number };
type RemotePoint = Point & { documentX: number; documentY: number };
type State = "live" | "socket" | "identity" | "expired";

const copy = {
  "en-US": {
    label: "Realtime cursor sampler",
    move: "move here",
    scroll: "scroll",
    socket: "WS",
    identity: "ID",
    expire: "expire",
    states: {
      live: "broadcast",
      socket: "socket closed",
      identity: "ID rejected",
      expired: "expired",
    },
  },
  "pt-BR": {
    label: "Amostrador de cursor em tempo real",
    move: "mova aqui",
    scroll: "rolagem",
    socket: "WS",
    identity: "ID",
    expire: "expirar",
    states: {
      live: "transmitido",
      socket: "socket fechado",
      identity: "ID rejeitado",
      expired: "expirado",
    },
  },
} as const;

const DOCUMENT_WIDTH = 600;
const VIEWPORT_HEIGHT = 240;

export function CursorProtocolLab(props: CursorProtocolLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [local, setLocal] = createSignal<Point>({ x: 35, y: 45 });
  const [remote, setRemote] = createSignal<RemotePoint>();
  const [scrollY, setScrollY] = createSignal(480);
  const [socketOpen, setSocketOpen] = createSignal(true);
  const [identityMatches, setIdentityMatches] = createSignal(true);
  const [active, setActive] = createSignal(true);
  const [state, setState] = createSignal<State>("live");

  const documentPoint = createMemo(() => ({
    x: Math.round((local().x / 100) * DOCUMENT_WIDTH),
    y: Math.round((local().y / 100) * VIEWPORT_HEIGHT + scrollY()),
  }));

  onMount(() => {
    const timer = window.setInterval(() => {
      if (!active()) return;
      if (!socketOpen()) {
        setState("socket");
        return;
      }
      if (!identityMatches()) {
        setState("identity");
        return;
      }

      setRemote({ ...local(), documentX: documentPoint().x, documentY: documentPoint().y });
      setState("live");
    }, 50);
    onCleanup(() => window.clearInterval(timer));
  });

  function movePointer(event: PointerEvent & { currentTarget: HTMLDivElement }) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setLocal({
      x: Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100)),
    });
    setActive(true);
  }

  return (
    <LabFrame id="cursor-protocol" label={text().label} class="mx-auto max-w-xl">
      <div class="overflow-hidden rounded-[1.35rem] border border-violet-300/15 bg-[#090716] shadow-xl shadow-violet-950/25">
        <div
          class="relative h-52 touch-none overflow-hidden bg-[linear-gradient(rgba(167,139,250,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(167,139,250,0.06)_1px,transparent_1px)] bg-[size:24px_24px]"
          onPointerMove={movePointer}
          role="application"
          aria-label={text().move}
        >
          <span class="pointer-events-none absolute top-3 left-3 font-mono text-[9px] tracking-[0.2em] text-violet-200/35 uppercase">
            {text().move}
          </span>

          <span
            class="pointer-events-none absolute z-20 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-300 shadow-[0_0_16px_rgba(125,211,252,0.8)]"
            style={{ left: `${local().x}%`, top: `${local().y}%` }}
          />
          {remote() ? (
            <span
              class="pointer-events-none absolute z-10 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/80 transition-[left,top] duration-75"
              style={{ left: `${remote()!.x}%`, top: `${remote()!.y}%` }}
            />
          ) : null}

          <code class="pointer-events-none absolute right-3 bottom-3 rounded-md bg-slate-950/75 px-2 py-1 font-mono text-[9px] text-slate-400">
            {remote() ? `{x:${remote()!.documentX}, y:${remote()!.documentY}}` : "∅"}
          </code>
        </div>

        <div class="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-violet-200/10 p-2.5">
          <label class="flex min-w-0 items-center gap-2 font-mono text-[9px] text-slate-500">
            <span>{text().scroll}</span>
            <input
              type="range"
              min="0"
              max="1200"
              step="40"
              value={scrollY()}
              onInput={(event) => setScrollY(event.currentTarget.valueAsNumber)}
              class="min-w-0 flex-1 accent-violet-400"
            />
            <output class="w-9 text-right text-slate-300">{scrollY()}</output>
          </label>

          <div class="flex gap-1">
            <button
              type="button"
              onClick={() => setSocketOpen((value) => !value)}
              aria-pressed={socketOpen()}
              class={`rounded px-2 py-1 font-mono text-[9px] ${socketOpen() ? "bg-blue-300/15 text-blue-200" : "bg-rose-300/10 text-rose-200"}`}
            >
              {text().socket}
            </button>
            <button
              type="button"
              onClick={() => setIdentityMatches((value) => !value)}
              aria-pressed={identityMatches()}
              class={`rounded px-2 py-1 font-mono text-[9px] ${identityMatches() ? "bg-violet-300/15 text-violet-200" : "bg-rose-300/10 text-rose-200"}`}
            >
              {text().identity}
            </button>
            <button
              type="button"
              onClick={() => {
                setActive(false);
                setRemote(undefined);
                setState("expired");
              }}
              class="rounded bg-slate-800 px-2 py-1 font-mono text-[9px] text-slate-400"
            >
              {text().expire}
            </button>
          </div>
        </div>

        <div
          class="flex items-center gap-2 px-3 pb-2.5 font-mono text-[9px] text-slate-500"
          aria-live="polite"
        >
          <span
            class={`size-1.5 rounded-full ${state() === "live" ? "bg-emerald-300" : "bg-rose-300"}`}
          />
          {text().states[state()]}
          <span class="ml-auto text-slate-700">50 ms</span>
        </div>
      </div>
    </LabFrame>
  );
}
