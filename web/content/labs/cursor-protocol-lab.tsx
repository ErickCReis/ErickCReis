import { Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type CursorProtocolLabProps = { locale?: Locale };
type Point = { x: number; y: number };
type RemotePoint = Point & { documentX: number; documentY: number };
type State = "live" | "socket" | "identity" | "expired";

function getCopy(locale: Locale) {
  return {
    label: t(locale, "Cursor protocol workbench"),
    move: t(locale, "Move the local cursor"),
    you: t(locale, "you"),
    peer: t(locale, "peer"),
    scroll: t(locale, "scroll"),
    socket: t(locale, "socket"),
    identity: t(locale, "ID match"),
    expire: t(locale, "skip 7s"),
    states: {
      live: t(locale, "delivered"),
      socket: t(locale, "dropped · socket closed"),
      identity: t(locale, "dropped · ID mismatch"),
      expired: t(locale, "expired · 7s"),
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

  const viewportPoint = createMemo(() => ({
    x: Math.round((local().x / 100) * DOCUMENT_WIDTH),
    y: Math.round((local().y / 100) * VIEWPORT_HEIGHT),
  }));

  const documentPoint = createMemo(() => ({
    x: viewportPoint().x,
    y: viewportPoint().y + scrollY(),
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
    `flex h-9 items-center justify-center gap-2 rounded-full px-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-reduce:transition-none ${
      failed
        ? "bg-[#ff5c7a] text-[#18070b]"
        : open
          ? "bg-[#173348] text-cyan-100 hover:bg-[#20445e]"
          : "bg-[#111c27] text-slate-500 hover:text-slate-300"
    }`;

  return (
    <section
      class="not-prose my-8 mx-auto max-w-2xl"
      aria-label={text().label}
      data-concept-lab="cursor-protocol"
    >
      <div class="overflow-hidden rounded-[1.75rem] bg-[#07111b] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-4">
        <div class="grid grid-cols-[minmax(0,1fr)_7rem] gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
          <div
            class="relative h-64 touch-none overflow-hidden rounded-[1.25rem] bg-[#0b2233] bg-[radial-gradient(circle_at_center,rgba(103,232,249,0.16)_1px,transparent_1px)] bg-[size:20px_20px] outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
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
            <div class="absolute inset-x-4 top-4 flex items-center justify-between gap-3 font-mono text-xs font-semibold text-cyan-100/70">
              <span>{text().you}</span>
              <code class="tabular-nums">
                {viewportPoint().x}, {viewportPoint().y}
              </code>
            </div>

            <span
              class="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#67e8f9] shadow-[0_0_0_8px_rgba(103,232,249,0.12),0_0_30px_rgba(103,232,249,0.42)]"
              style={{ left: `${local().x}%`, top: `${local().y}%` }}
            />

            <div class="absolute inset-x-3 bottom-3 rounded-2xl bg-[#06101a]/90 p-3 backdrop-blur-sm">
              <div class="flex items-center gap-2 font-mono text-sm font-bold tabular-nums text-white">
                <span class="text-cyan-300">y {viewportPoint().y}</span>
                <span class="text-slate-600">+</span>
                <span class="text-amber-300">{scrollY()}</span>
                <span class="text-slate-600">→</span>
                <span>{documentPoint().y}</span>
              </div>
              <label class="mt-2 grid grid-cols-[auto_1fr] items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-amber-200/70">
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
                  class="min-w-0 accent-amber-300"
                />
              </label>
            </div>
          </div>

          <div class="relative h-64 overflow-hidden rounded-[1.25rem] bg-[#f0efe9]">
            <div
              class="absolute inset-x-0 bg-[#ffcf4a]/45 transition-[top] motion-reduce:transition-none"
              style={{
                top: `${(scrollY() / DOCUMENT_HEIGHT) * 100}%`,
                height: `${(VIEWPORT_HEIGHT / DOCUMENT_HEIGHT) * 100}%`,
              }}
              aria-hidden="true"
            />
            <div class="absolute inset-x-3 top-3 flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#22252a]/60">
              <span>{text().peer}</span>
              <span>2400</span>
            </div>
            <Show when={remote()}>
              {(point) => (
                <span
                  class="absolute size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] bg-[#ff3f66] shadow-[0_0_0_6px_rgba(255,63,102,0.15)] transition-[left,top] motion-reduce:transition-none"
                  style={{
                    left: `${(point().documentX / DOCUMENT_WIDTH) * 100}%`,
                    top: `${(point().documentY / DOCUMENT_HEIGHT) * 100}%`,
                  }}
                />
              )}
            </Show>
            <code class="absolute inset-x-3 bottom-3 text-right font-mono text-xs font-bold tabular-nums text-[#22252a]">
              {remote() ? `${remote()!.documentX}, ${remote()!.documentY}` : "—"}
            </code>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSocket}
            aria-pressed={socketOpen()}
            class={gateClass(socketOpen(), state() === "socket")}
          >
            <span class={`size-2 rounded-full ${socketOpen() ? "bg-current" : "bg-slate-700"}`} />
            {text().socket}
          </button>
          <span class="font-mono text-slate-700" aria-hidden="true">
            →
          </span>
          <button
            type="button"
            onClick={toggleIdentity}
            aria-pressed={identityMatches()}
            class={gateClass(identityMatches(), state() === "identity")}
          >
            <span
              class={`size-2 rounded-full ${identityMatches() ? "bg-current" : "bg-slate-700"}`}
            />
            {text().identity}
          </button>
          <span class="font-mono text-slate-700" aria-hidden="true">
            →
          </span>
          <output
            class={`font-mono text-xs font-bold ${state() === "live" ? "text-cyan-200" : "text-[#ff7891]"}`}
            aria-live="polite"
          >
            {text().states[state()]}
          </output>
          <button
            type="button"
            onClick={expire}
            class="ml-auto rounded-full px-2 py-1 font-mono text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 motion-reduce:transition-none"
          >
            {text().expire}
          </button>
        </div>
      </div>
    </section>
  );
}
