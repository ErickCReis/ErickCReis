import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type ViewCounterLabProps = { locale?: LabLocale };
type Visitor = "A" | "B";
type RecentView = { visitor: Visitor; at: number };
type Result = "idle" | "counted" | "deduped" | "waiting";

const copy = {
  "en-US": {
    label: "View deduplication counter",
    open: "open article",
    visible: "visible tab",
    hidden: "hidden tab",
    recent: "24h tokens",
    empty: "empty",
    results: {
      idle: "ready",
      counted: "+1 counted",
      deduped: "same visitor",
      waiting: "waiting for tab",
    },
  },
  "pt-BR": {
    label: "Contador de visualizações deduplicadas",
    open: "abrir artigo",
    visible: "aba visível",
    hidden: "aba oculta",
    recent: "tokens de 24h",
    empty: "vazio",
    results: {
      idle: "pronto",
      counted: "+1 contado",
      deduped: "mesmo visitante",
      waiting: "aguardando a aba",
    },
  },
} as const;

const WINDOW_HOURS = 24;

export function ViewCounterLab(props: ViewCounterLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [visitor, setVisitor] = createSignal<Visitor>("A");
  const [visible, setVisible] = createSignal(true);
  const [clock, setClock] = createSignal(0);
  const [total, setTotal] = createSignal(247);
  const [recent, setRecent] = createSignal<RecentView[]>([]);
  const [pendingVisitor, setPendingVisitor] = createSignal<Visitor>();
  const [result, setResult] = createSignal<Result>("idle");

  const currentRows = createMemo(() => recent().filter((row) => clock() - row.at <= WINDOW_HOURS));

  function write(activeVisitor: Visitor) {
    const retained = currentRows();
    if (retained.some((row) => row.visitor === activeVisitor)) {
      setRecent(retained);
      setResult("deduped");
      return;
    }
    setRecent([...retained, { visitor: activeVisitor, at: clock() }]);
    setTotal((value) => value + 1);
    setResult("counted");
  }

  function openArticle() {
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
    if (next && pendingVisitor()) {
      write(pendingVisitor()!);
      setPendingVisitor(undefined);
    }
  }

  return (
    <LabFrame id="view-counter-transaction" label={text().label} class="mx-auto max-w-sm">
      <div class="rounded-[2.25rem] border border-fuchsia-200/15 bg-[linear-gradient(160deg,#241228,#0b0710)] p-4 shadow-2xl shadow-fuchsia-950/30">
        <div class="flex items-center justify-between font-mono text-[9px] text-fuchsia-200/45">
          <span>T+{clock()}h</span>
          <button
            type="button"
            onClick={toggleVisibility}
            aria-pressed={visible()}
            class={visible() ? "text-emerald-200" : "text-rose-200"}
          >
            {visible() ? "●" : "○"} {visible() ? text().visible : text().hidden}
          </button>
        </div>

        <output
          class="my-4 block text-center font-mono text-6xl tracking-[0.12em] text-fuchsia-100 tabular-nums"
          aria-live="polite"
        >
          {String(total()).padStart(3, "0")}
        </output>

        <div class="flex items-center justify-center gap-3">
          <For each={["A", "B"] as const}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setVisitor(choice)}
                aria-pressed={visitor() === choice}
                class={`grid size-10 place-items-center rounded-full border font-mono text-sm transition ${
                  visitor() === choice
                    ? "border-fuchsia-200 bg-fuchsia-200 text-slate-950"
                    : "border-fuchsia-200/20 text-fuchsia-200/50"
                }`}
              >
                {choice}
              </button>
            )}
          </For>
          <button
            type="button"
            onClick={openArticle}
            class="ml-2 rounded-full bg-fuchsia-400 px-4 py-2 font-mono text-[10px] font-semibold text-slate-950 active:scale-95"
          >
            ◉ {text().open}
          </button>
        </div>

        <div class="mt-4 rounded-2xl bg-slate-950/45 p-2.5">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[9px] text-slate-600">{text().recent}</span>
            <div class="flex flex-1 gap-1.5">
              <Show
                when={recent().length > 0}
                fallback={<span class="font-mono text-[9px] text-slate-800">{text().empty}</span>}
              >
                <For each={recent()}>
                  {(row) => {
                    const age = () => clock() - row.at;
                    const expired = () => age() > WINDOW_HOURS;
                    return (
                      <span
                        class={`rounded-full px-2 py-1 font-mono text-[9px] ${expired() ? "bg-amber-300/10 text-amber-300/50" : "bg-fuchsia-300/10 text-fuchsia-200"}`}
                      >
                        {row.visitor} · {age()}h
                      </span>
                    );
                  }}
                </For>
              </Show>
            </div>
            <button
              type="button"
              onClick={() => setClock((value) => value + 6)}
              class="font-mono text-[9px] text-slate-500"
            >
              +6h
            </button>
            <button
              type="button"
              onClick={() => setClock((value) => value + 24)}
              class="font-mono text-[9px] text-slate-500"
            >
              +24h
            </button>
          </div>
        </div>

        <p class="mt-2 text-center font-mono text-[9px] text-fuchsia-200/55" aria-live="polite">
          {text().results[result()]}
        </p>
      </div>
    </LabFrame>
  );
}
