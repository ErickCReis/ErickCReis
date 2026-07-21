import { Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type CursorProtocolLabProps = { locale?: Locale };
type Point = { x: number; y: number };
type RemotePoint = Point & { documentX: number; documentY: number };
type State = "live" | "socket" | "identity" | "expired";
function getCopy(locale: Locale) {
  return {
    label: t(locale, "Cursor protocol workbench"),
    viewport: t(locale, "you"),
    document: t(locale, "peer"),
    move: t(locale, "Move the local cursor"),
    hint: t(locale, "drag or use arrow keys"),
    you: t(locale, "you"),
    peer: t(locale, "peer"),
    scroll: t(locale, "scroll"),
    socket: t(locale, "socket"),
    identity: t(locale, "ID match"),
    expire: t(locale, "skip 7s"),
    states: {
      live: t(locale, "sample delivered to the remote document"),
      socket: t(locale, "sample dropped: socket closed"),
      identity: t(locale, "sample dropped: identity mismatch"),
      expired: t(locale, "remote cursor expired after 7 seconds"),
    },
  };
}

const DOCUMENT_WIDTH = 1200;
const DOCUMENT_HEIGHT = 2400;
const VIEWPORT_HEIGHT = 600;
const KEYBOARD_STEP = 4;

function clamp(value: number) {
  return Math.max(2, Math.min(98, value));
}

export function CursorProtocolLab(props: CursorProtocolLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
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

  const gateClass = (open: boolean, failed: boolean) =>
    `group flex min-w-24 items-center gap-2 rounded-md px-2 py-2 text-left font-mono text-[9px] leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 motion-reduce:transition-none ${
      failed
        ? "bg-rose-400/10 text-rose-200"
        : open
          ? "text-slate-300 hover:bg-white/[0.04]"
          : "text-slate-500 hover:text-slate-300"
    }`;

  return (
    <section
      class="not-prose my-8 mx-auto max-w-xl"
      aria-label={text().label}
      data-concept-lab="cursor-protocol"
    >
      <div class="border-y border-white/10 py-4">
        <div class="mb-3 flex items-center justify-between gap-3 font-mono text-[8px] uppercase tracking-[0.16em] text-slate-600">
          <span>50 ms</span>
          <button
            type="button"
            onClick={expire}
            class="rounded px-1 py-0.5 normal-case tracking-normal text-slate-500 transition-colors hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 motion-reduce:transition-none"
          >
            {text().expire}
          </button>
        </div>

        <div class="grid items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_6.5rem_7rem]">
          <div
            class="relative h-48 touch-none overflow-hidden rounded-sm bg-sky-300/[0.035] outline-none ring-1 ring-inset ring-sky-200/10 focus-visible:ring-2 focus-visible:ring-sky-200/60"
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
            <span class="absolute top-2.5 left-3 font-mono text-[8px] uppercase tracking-[0.14em] text-sky-200/45">
              {text().viewport}
            </span>
            <span class="absolute right-3 bottom-2.5 font-mono text-[8px] text-slate-600">
              {text().hint}
            </span>
            <span
              class="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_0_4px_rgba(125,211,252,0.08)]"
              style={{ left: `${local().x}%`, top: `${local().y}%` }}
            >
              <span class="absolute top-2 left-2 whitespace-nowrap font-mono text-[8px] text-sky-200">
                {text().you}
              </span>
            </span>
            <code class="absolute top-2.5 right-3 font-mono text-[8px] text-sky-100/55">
              {Math.round((local().x / 100) * DOCUMENT_WIDTH)},
              {Math.round((local().y / 100) * VIEWPORT_HEIGHT)}
            </code>
          </div>

          <div class="flex items-center justify-center sm:flex-col" aria-label={text().label}>
            <span class="h-px flex-1 bg-white/10 sm:h-auto sm:w-px" aria-hidden="true" />
            <button
              type="button"
              onClick={toggleSocket}
              aria-pressed={socketOpen()}
              class={gateClass(socketOpen(), state() === "socket")}
            >
              <span
                class={`size-1.5 shrink-0 rounded-full ${
                  socketOpen() ? "bg-emerald-300" : "bg-slate-700"
                }`}
              />
              {text().socket}
            </button>
            <span class="h-px flex-1 bg-white/10 sm:h-3 sm:w-px sm:flex-none" aria-hidden="true" />
            <button
              type="button"
              onClick={toggleIdentity}
              aria-pressed={identityMatches()}
              class={gateClass(identityMatches(), state() === "identity")}
            >
              <span
                class={`size-1.5 shrink-0 rounded-full ${
                  identityMatches() ? "bg-emerald-300" : "bg-slate-700"
                }`}
              />
              {text().identity}
            </button>
            <span class="h-px flex-1 bg-white/10 sm:h-auto sm:w-px" aria-hidden="true" />
          </div>

          <div class="relative h-48 overflow-hidden rounded-sm bg-violet-300/[0.025] ring-1 ring-inset ring-violet-200/10">
            <span class="absolute top-2.5 left-3 z-10 font-mono text-[8px] uppercase tracking-[0.14em] text-violet-200/45">
              {text().document}
            </span>
            <span class="absolute right-2 bottom-2 z-10 font-mono text-[8px] text-slate-600">
              2400px
            </span>
            <span
              class="pointer-events-none absolute inset-x-1 border-y border-violet-200/15 bg-violet-200/[0.035] transition-[top] motion-reduce:transition-none"
              style={{
                top: `${(scrollY() / DOCUMENT_HEIGHT) * 100}%`,
                height: `${(VIEWPORT_HEIGHT / DOCUMENT_HEIGHT) * 100}%`,
              }}
              aria-hidden="true"
            />
            <Show when={remote()}>
              {(point) => (
                <span
                  class="absolute z-10 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-violet-300 shadow-[0_0_0_4px_rgba(196,181,253,0.08)] transition-[left,top] motion-reduce:transition-none"
                  style={{
                    left: `${(point().documentX / DOCUMENT_WIDTH) * 100}%`,
                    top: `${(point().documentY / DOCUMENT_HEIGHT) * 100}%`,
                  }}
                >
                  <span class="absolute top-2 left-2 -rotate-45 whitespace-nowrap font-mono text-[8px] text-violet-200">
                    {text().peer}
                  </span>
                </span>
              )}
            </Show>
          </div>
        </div>

        <label class="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3 font-mono text-[9px] text-slate-500">
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
            class="min-w-20 accent-violet-300"
          />
          <output class="w-14 text-right tabular-nums">+{scrollY()}px</output>
        </label>

        <div class="mt-3 flex items-baseline justify-between gap-3 border-t border-white/[0.06] pt-3">
          <output class="text-xs text-slate-400" aria-live="polite">
            {text().states[state()]}
          </output>
          <code class="shrink-0 font-mono text-[8px] tabular-nums text-slate-600">
            x:{documentPoint().x} y:{documentPoint().y}
          </code>
        </div>
      </div>
    </section>
  );
}
