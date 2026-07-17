import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type ViewCounterLabProps = { locale?: LabLocale };
type Visitor = "A" | "B";
type RecentView = { visitor: Visitor; at: number };
type Result = "idle" | "counted" | "deduped" | "waiting";

const copy = {
  "en-US": {
    label: "Interactive 24-hour view deduplication transaction",
    article: "static MDX",
    views: "views",
    browser: "browser",
    visible: "visible",
    hidden: "hidden",
    read: "read article",
    queued: "read queued",
    advance: "+25h",
    reset: "reset",
    steps: {
      idle: ["visibility", "24h token", "total"],
      waiting: ["waiting", "not checked", "unchanged"],
      counted: ["passed", "new token", "+1"],
      deduped: ["passed", "token found", "unchanged"],
    },
    results: {
      idle: "Choose a browser and read the article.",
      waiting: "The hidden tab holds the request until it becomes visible.",
      counted: "SQLite stored a token and incremented the permanent total.",
      deduped: "This browser already has an active token; the total stays put.",
    },
    token: "token",
    active: "active",
    expired: "expired",
  },
  "pt-BR": {
    label: "Transação interativa de deduplicação de visualizações por 24 horas",
    article: "MDX estático",
    views: "visualizações",
    browser: "navegador",
    visible: "visível",
    hidden: "oculta",
    read: "ler artigo",
    queued: "leitura na fila",
    advance: "+25h",
    reset: "reiniciar",
    steps: {
      idle: ["visibilidade", "token de 24h", "total"],
      waiting: ["aguardando", "não consultado", "sem alteração"],
      counted: ["liberado", "novo token", "+1"],
      deduped: ["liberado", "token encontrado", "sem alteração"],
    },
    results: {
      idle: "Escolha um navegador e leia o artigo.",
      waiting: "A aba oculta retém a requisição até voltar a ficar visível.",
      counted: "O SQLite guardou um token e incrementou o total permanente.",
      deduped: "Este navegador já tem um token ativo; o total permanece igual.",
    },
    token: "token",
    active: "ativo",
    expired: "vencido",
  },
} as const;

const visitors: Visitor[] = ["A", "B"];
const WINDOW_HOURS = 24;
const INITIAL_TOTAL = 247;

export function ViewCounterLab(props: ViewCounterLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
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

  const buttonClass = (active: boolean) =>
    `rounded-full px-2.5 py-1.5 font-mono text-[9px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-200 ${
      active ? "bg-fuchsia-200 text-slate-950" : "text-slate-500 hover:text-slate-200"
    }`;

  return (
    <LabFrame id="view-counter-transaction" label={text().label} class="mx-auto max-w-xl">
      <div class="border-y border-white/10 py-4">
        <div class="flex flex-wrap items-center gap-1">
          <For each={visitors}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setVisitor(choice)}
                aria-pressed={visitor() === choice}
                class={buttonClass(visitor() === choice)}
              >
                {text().browser} {choice}
              </button>
            )}
          </For>
          <button
            type="button"
            onClick={toggleVisibility}
            aria-pressed={visible()}
            class={buttonClass(visible())}
          >
            {visible() ? text().visible : text().hidden}
          </button>
          <button
            type="button"
            onClick={() => setClock((value) => value + 25)}
            class="rounded-full px-2.5 py-1.5 font-mono text-[9px] text-slate-500 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
          >
            {text().advance}
          </button>
          <button
            type="button"
            onClick={reset}
            class="ml-auto rounded-full px-2.5 py-1.5 font-mono text-[9px] text-slate-600 hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
          >
            {text().reset}
          </button>
        </div>

        <div class="mt-5 flex items-baseline justify-between gap-4">
          <p class="font-serif text-lg text-slate-300">{text().article}</p>
          <p class="font-mono text-3xl text-fuchsia-200">
            {total()} <span class="text-[9px] text-slate-600">{text().views}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={read}
          disabled={result() === "waiting"}
          class="mt-4 rounded-full bg-fuchsia-200 px-3 py-1.5 font-mono text-[9px] text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-100 disabled:cursor-wait disabled:bg-amber-200"
        >
          {result() === "waiting" ? text().queued : text().read}
        </button>

        <div
          class="mt-4 flex flex-wrap items-center gap-2 font-mono text-[8px] text-slate-600"
          aria-hidden="true"
        >
          <For each={text().steps[result()]}>
            {(step, index) => (
              <>
                <span>{step}</span>
                <Show when={index() < 2}>
                  <span>→</span>
                </Show>
              </>
            )}
          </For>
        </div>

        <Show when={recent().length > 0}>
          <div class="mt-3 flex flex-wrap gap-3 font-mono text-[8px]">
            <For each={recent()}>
              {(row) => {
                const age = () => clock() - row.at;
                const expired = () => age() > WINDOW_HOURS;
                return (
                  <span class={expired() ? "text-amber-200/70" : "text-fuchsia-200/70"}>
                    {text().token} {row.visitor} · {age()}h ·{" "}
                    {expired() ? text().expired : text().active}
                  </span>
                );
              }}
            </For>
          </div>
        </Show>

        <output class="mt-4 block text-xs text-slate-400" aria-live="polite">
          {text().results[result()]}
        </output>
      </div>
    </LabFrame>
  );
}
