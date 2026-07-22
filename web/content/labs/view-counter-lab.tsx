import { For, createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type ViewCounterLabProps = { locale?: Locale };
type Visitor = "A" | "B";
type RecentView = { visitor: Visitor; at: number };
type Result = "idle" | "counted" | "deduped" | "waiting";
function getCopy(locale: Locale) {
  return {
    label: t(locale, "Interactive 24-hour view deduplication transaction"),
    article: t(locale, "static MDX"),
    views: t(locale, "views"),
    browser: t(locale, "browser"),
    visible: t(locale, "visible"),
    hidden: t(locale, "hidden"),
    read: t(locale, "read article"),
    queued: t(locale, "read queued"),
    advance: t(locale, "+25h"),
    reset: t(locale, "reset"),
    results: {
      idle: t(locale, "Choose a browser and read the article."),
      waiting: t(locale, "Waiting for a visible tab."),
      counted: t(locale, "Token stored. Total +1."),
      deduped: t(locale, "Active token found. Total unchanged."),
    },
  };
}

const visitors: Visitor[] = ["A", "B"];
const WINDOW_HOURS = 24;
const INITIAL_TOTAL = 247;

export function ViewCounterLab(props: ViewCounterLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const [visitor, setVisitor] = createSignal<Visitor>("A");
  const [visible, setVisible] = createSignal(true);
  const [clock, setClock] = createSignal(0);
  const [total, setTotal] = createSignal(INITIAL_TOTAL);
  const [recent, setRecent] = createSignal<RecentView[]>([]);
  const [pendingVisitor, setPendingVisitor] = createSignal<Visitor>();
  const [result, setResult] = createSignal<Result>("idle");

  const activeRows = createMemo(() => recent().filter((row) => clock() - row.at <= WINDOW_HOURS));

  function write(activeVisitor: Visitor) {
    const retained = activeRows();
    setRecent(retained);
    if (retained.some((row) => row.visitor === activeVisitor)) {
      setResult("deduped");
      return;
    }
    setRecent([...retained, { visitor: activeVisitor, at: clock() }]);
    setTotal((value) => value + 1);
    setResult("counted");
  }

  function read() {
    if (!visible()) {
      setPendingVisitor(visitor());
      setResult("waiting");
      return;
    }
    write(visitor());
  }

  function toggleVisibility() {
    const next = !visible();
    setVisible(next);
    const pending = pendingVisitor();
    if (next && pending) {
      setPendingVisitor(undefined);
      write(pending);
    }
  }

  function reset() {
    setVisitor("A");
    setVisible(true);
    setClock(0);
    setTotal(INITIAL_TOTAL);
    setRecent([]);
    setPendingVisitor(undefined);
    setResult("idle");
  }

  const browserClass = (active: boolean) =>
    `flex min-h-11 flex-1 items-center justify-center rounded-xl font-mono text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-950 disabled:cursor-wait motion-reduce:transition-none ${
      active
        ? "bg-indigo-950 text-white"
        : "bg-black/5 text-slate-500 hover:bg-black/10 hover:text-indigo-950"
    }`;

  return (
    <section
      class="not-prose mx-auto my-10 max-w-xl py-3"
      aria-label={text().label}
      data-concept-lab="view-counter-transaction"
    >
      <div class="overflow-hidden rounded-[2rem] bg-[#f3efe3] text-indigo-950 shadow-[0_24px_80px_-40px_rgba(99,102,241,0.7)]">
        <div class="flex items-center justify-between bg-[#ff6b4a] px-5 py-4 sm:px-7">
          <p class="font-mono text-sm font-black uppercase tracking-wider">{text().article}</p>
          <button
            type="button"
            onClick={toggleVisibility}
            aria-pressed={visible()}
            class="flex min-h-10 items-center gap-2 rounded-full bg-indigo-950 px-4 font-mono text-sm font-black text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-950 motion-reduce:transition-none"
          >
            <span
              class={`size-2.5 rounded-full ${visible() ? "bg-lime-300" : "bg-orange-300"}`}
              aria-hidden="true"
            />
            {visible() ? text().visible : text().hidden}
          </button>
        </div>

        <div class="grid gap-6 px-5 py-6 sm:grid-cols-[1fr_auto] sm:items-end sm:px-7">
          <div>
            <p class="font-mono text-sm font-bold uppercase tracking-widest text-indigo-950/50">
              {text().views}
            </p>
            <p class="mt-1 text-6xl font-black leading-none tabular-nums tracking-[-0.07em]">
              {total()}
            </p>
          </div>

          <div class="sm:w-44">
            <p class="mb-2 font-mono text-sm font-bold text-indigo-950/50">{text().browser}</p>
            <div class="flex gap-2">
              <For each={visitors}>
                {(choice) => (
                  <button
                    type="button"
                    onClick={() => {
                      setVisitor(choice);
                      setResult("idle");
                    }}
                    disabled={result() === "waiting"}
                    aria-label={`${text().browser} ${choice}`}
                    aria-pressed={visitor() === choice}
                    class={browserClass(visitor() === choice)}
                  >
                    {choice}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        <div class="bg-indigo-950 p-5 sm:p-7">
          <button
            type="button"
            onClick={read}
            disabled={result() === "waiting"}
            class="min-h-14 w-full rounded-2xl bg-lime-300 px-5 font-mono text-base font-black text-indigo-950 transition hover:bg-lime-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300 disabled:cursor-wait disabled:bg-orange-300 motion-reduce:transition-none"
          >
            {result() === "waiting" ? text().queued : text().read}
          </button>

          <div class="mt-4 flex min-h-10 flex-wrap items-center justify-between gap-3">
            <output class="text-sm font-semibold text-white/75" aria-live="polite">
              {text().results[result()]}
            </output>
            <div class="flex shrink-0 gap-4 font-mono text-sm font-bold">
              <button
                type="button"
                onClick={() => {
                  setClock((value) => value + 25);
                  setResult("idle");
                }}
                class="text-lime-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 motion-reduce:transition-none"
              >
                {text().advance}
              </button>
              <button
                type="button"
                onClick={reset}
                class="text-white/45 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                {text().reset}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
