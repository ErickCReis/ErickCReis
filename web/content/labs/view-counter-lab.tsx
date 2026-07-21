import { For, Show, createMemo, createSignal } from "solid-js";
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
    steps: {
      idle: [t(locale, "visibility"), t(locale, "24h token"), t(locale, "total")],
      waiting: [t(locale, "waiting"), t(locale, "not checked"), t(locale, "unchanged")],
      counted: [t(locale, "passed"), t(locale, "new token"), t(locale, "+1")],
      deduped: [t(locale, "passed"), t(locale, "token found"), t(locale, "unchanged")],
    },
    results: {
      idle: t(locale, "Choose a browser and read the article."),
      waiting: t(locale, "The hidden tab holds the request until it becomes visible."),
      counted: t(locale, "SQLite stored a token and incremented the permanent total."),
      deduped: t(locale, "This browser already has an active token; the total stays put."),
    },
    token: t(locale, "token"),
    active: t(locale, "active"),
    expired: t(locale, "expired"),
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
    `flex size-9 items-center justify-center border font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-200 motion-reduce:transition-none ${
      active
        ? "border-fuchsia-200 bg-fuchsia-200 text-slate-950"
        : "border-white/10 text-slate-500 hover:border-white/30 hover:text-slate-200"
    }`;

  return (
    <section
      class="not-prose my-8 mx-auto max-w-xl"
      aria-label={text().label}
      data-concept-lab="view-counter-transaction"
    >
      <div class="border-y border-white/10 py-5">
        <div class="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <div>
            <p class="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-600">
              {text().browser}
            </p>
            <div class="flex gap-2">
              <For each={visitors}>
                {(choice) => (
                  <button
                    type="button"
                    onClick={() => setVisitor(choice)}
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

          <div class="min-w-0 border-l border-white/10 pl-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-serif text-xl text-slate-200">{text().article}</p>
                <button
                  type="button"
                  onClick={toggleVisibility}
                  aria-pressed={visible()}
                  class="mt-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-slate-500 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fuchsia-200"
                >
                  <span
                    class={`size-1.5 ${visible() ? "bg-emerald-300" : "bg-amber-200"}`}
                    aria-hidden="true"
                  />
                  {visible() ? text().visible : text().hidden}
                </button>
              </div>
              <p class="text-right font-mono text-4xl leading-none tabular-nums text-fuchsia-200">
                {total()}
                <span class="mt-1 block text-xs uppercase tracking-widest text-slate-600">
                  {text().views}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={read}
              disabled={result() === "waiting"}
              class="mt-6 w-full border border-fuchsia-200/50 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-fuchsia-100 transition-colors hover:bg-fuchsia-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-100 disabled:cursor-wait disabled:border-amber-200/50 disabled:text-amber-100 motion-reduce:transition-none"
            >
              {result() === "waiting" ? text().queued : text().read}
            </button>
          </div>
        </div>

        <div
          class="mt-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2"
          aria-hidden="true"
        >
          <For each={text().steps[result()]}>
            {(step, index) => (
              <>
                <div class="min-w-0 text-center">
                  <span
                    class={`mx-auto mb-1.5 block size-1.5 ${
                      result() === "waiting" && index() > 0 ? "bg-slate-700" : "bg-fuchsia-200"
                    }`}
                  />
                  <span class="block truncate font-mono text-xs text-slate-500">{step}</span>
                </div>
                <Show when={index() < 2}>
                  <span class="h-px w-4 bg-white/10" />
                </Show>
              </>
            )}
          </For>
        </div>

        <output
          class="mt-4 block text-center text-sm leading-relaxed text-slate-400"
          aria-live="polite"
        >
          {text().results[result()]}
        </output>

        <div class="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-3">
          <div class="min-h-5 font-mono text-xs">
            <Show when={recent().length > 0} fallback={<span class="text-slate-700">24h —</span>}>
              <For each={recent()}>
                {(row) => {
                  const age = () => clock() - row.at;
                  const expired = () => age() > WINDOW_HOURS;
                  return (
                    <span
                      class={`mr-3 inline-block ${
                        expired() ? "text-amber-200/70 line-through" : "text-fuchsia-200/70"
                      }`}
                    >
                      {text().token} {row.visitor} / {age()}h /{" "}
                      {expired() ? text().expired : text().active}
                    </span>
                  );
                }}
              </For>
            </Show>
          </div>
          <div class="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={() => setClock((value) => value + 25)}
              class="font-mono text-xs text-slate-500 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
            >
              {text().advance}
            </button>
            <button
              type="button"
              onClick={reset}
              class="font-mono text-xs text-slate-600 hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
            >
              {text().reset}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
