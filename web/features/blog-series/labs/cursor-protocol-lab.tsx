import { Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type CursorProtocolLabProps = { locale?: LabLocale };
type Point = { x: number; y: number };
type RemotePoint = Point & { documentX: number; documentY: number };
type State = "live" | "socket" | "identity" | "expired";

const copy = {
  "en-US": {
    label: "Cursor protocol workbench",
    move: "Move the local cursor",
    hint: "drag or use arrow keys",
    you: "you",
    peer: "peer",
    scroll: "scroll",
    socket: "socket",
    identity: "ID match",
    expire: "skip 7s",
    states: {
      live: "sample delivered to the remote document",
      socket: "sample dropped: socket closed",
      identity: "sample dropped: identity mismatch",
      expired: "remote cursor expired after 7 seconds",
    },
  },
  "pt-BR": {
    label: "Bancada do protocolo de cursores",
    move: "Mova o cursor local",
    hint: "arraste ou use as setas",
    you: "você",
    peer: "par",
    scroll: "rolagem",
    socket: "socket",
    identity: "IDs iguais",
    expire: "avançar 7s",
    states: {
      live: "amostra entregue ao documento remoto",
      socket: "amostra descartada: socket fechado",
      identity: "amostra descartada: identidades diferentes",
      expired: "cursor remoto expirou após 7 segundos",
    },
  },
} as const;

const DOCUMENT_WIDTH = 1200;
const DOCUMENT_HEIGHT = 2400;
const VIEWPORT_HEIGHT = 600;
const KEYBOARD_STEP = 4;

function clamp(value: number) {
  return Math.max(2, Math.min(98, value));
}

export function CursorProtocolLab(props: CursorProtocolLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [local, setLocal] = createSignal<Point>({ x: 45, y: 48 });
  const [remote, setRemote] = createSignal<RemotePoint>();
  const [scrollY, setScrollY] = createSignal(320);
  const [socketOpen, setSocketOpen] = createSignal(true);
  const [identityMatches, setIdentityMatches] = createSignal(true);
  const [state, setState] = createSignal<State>("live");
  let pending = true;

  const documentPoint = createMemo(() => ({
    x: Math.round((local().x / 100) * DOCUMENT_WIDTH),
    y: Math.round((local().y / 100) * VIEWPORT_HEIGHT + scrollY()),
  }));

  function queue(point?: Point) {
    if (point) setLocal(point);
    pending = true;
  }

  onMount(() => {
    const timer = window.setInterval(() => {
      if (!pending) return;
      pending = false;

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

  function pointFromPointer(event: PointerEvent & { currentTarget: HTMLDivElement }) {
    const bounds = event.currentTarget.getBoundingClientRect();
    queue({
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
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    queue({ x: clamp(local().x + offset.x), y: clamp(local().y + offset.y) });
  }

  function toggleSocket() {
    setSocketOpen((value) => !value);
    queue();
  }

  function toggleIdentity() {
    setIdentityMatches((value) => !value);
    queue();
  }

  function expire() {
    pending = false;
    setRemote(undefined);
    setState("expired");
  }

  const toggleClass = (active: boolean) =>
    `rounded-full px-2.5 py-1.5 font-mono text-[9px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200 motion-reduce:transition-none ${
      active ? "bg-violet-200 text-slate-950" : "text-slate-500 hover:text-slate-200"
    }`;

  return (
    <LabFrame id="cursor-protocol" label={text().label} class="mx-auto max-w-xl">
      <div class="border-y border-white/10 py-4">
        <div class="grid gap-4 sm:grid-cols-[1fr_7rem]">
          <div
            class="relative h-44 touch-none overflow-hidden bg-white/[0.025] outline-none focus-visible:ring-2 focus-visible:ring-violet-200/60"
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
            <span class="absolute top-2 left-2 font-mono text-[8px] text-slate-600">
              {text().hint}
            </span>
            <span
              class="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300"
              style={{ left: `${local().x}%`, top: `${local().y}%` }}
            >
              <span class="absolute top-2 left-2 font-mono text-[8px] text-sky-200">
                {text().you}
              </span>
            </span>
            <code class="absolute right-2 bottom-2 font-mono text-[8px] text-slate-500">
              x:{documentPoint().x} y:{documentPoint().y}
            </code>
          </div>

          <div class="relative h-44 border-l border-dashed border-white/10">
            <span class="absolute top-0 left-2 font-mono text-[8px] text-slate-600">2400px</span>
            <Show when={remote()}>
              {(point) => (
                <span
                  class="absolute size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-violet-300 transition-[left,top] motion-reduce:transition-none"
                  style={{
                    left: `${(point().documentX / DOCUMENT_WIDTH) * 100}%`,
                    top: `${(point().documentY / DOCUMENT_HEIGHT) * 100}%`,
                  }}
                >
                  <span class="absolute top-2 left-2 -rotate-45 font-mono text-[8px] text-violet-200">
                    {text().peer}
                  </span>
                </span>
              )}
            </Show>
          </div>
        </div>

        <label class="mt-4 flex items-center gap-2 font-mono text-[9px] text-slate-500">
          <span>{text().scroll}</span>
          <input
            type="range"
            min="0"
            max="1200"
            step="40"
            value={scrollY()}
            onInput={(event) => {
              setScrollY(event.currentTarget.valueAsNumber);
              queue();
            }}
            class="min-w-20 flex-1 accent-violet-300"
          />
          <output class="w-12 text-right">{scrollY()}px</output>
        </label>

        <div class="mt-3 flex flex-wrap gap-1" role="group" aria-label={text().label}>
          <button
            type="button"
            onClick={toggleSocket}
            aria-pressed={socketOpen()}
            class={toggleClass(socketOpen())}
          >
            {text().socket}
          </button>
          <button
            type="button"
            onClick={toggleIdentity}
            aria-pressed={identityMatches()}
            class={toggleClass(identityMatches())}
          >
            {text().identity}
          </button>
          <button
            type="button"
            onClick={expire}
            class="rounded-full px-2.5 py-1.5 font-mono text-[9px] text-slate-500 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
          >
            {text().expire}
          </button>
        </div>

        <div
          class="mt-4 flex items-center gap-2 font-mono text-[8px] text-slate-600"
          aria-hidden="true"
        >
          <span>50ms</span>
          <span>→</span>
          <span>socket</span>
          <span>→</span>
          <span>ID</span>
          <span>→</span>
          <span>peer</span>
        </div>
        <output class="mt-2 block text-xs text-slate-400" aria-live="polite">
          {text().states[state()]}
        </output>
      </div>
    </LabFrame>
  );
}
