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
    eyebrow: "STATIC ARTICLE · LIVE EDGE",
    title: "Only one number crosses the boundary",
    staticSide: "built once",
    article: "MDX article",
    articleParts: ["title", "date", "body"],
    runtimeSide: "runtime",
    totalViews: "total views",
    clock: "server clock",
    visible: "tab visible",
    hidden: "tab hidden",
    visitor: "browser cookie",
    visitorHint: "Choose an anonymous browser",
    read: "read article",
    readPending: "read queued",
    advance: "Advance time",
    reset: "reset lab",
    transaction: "latest transaction",
    steps: ["visibility gate", "24h token", "permanent total"],
    stepValues: {
      idle: ["ready", "not checked", "unchanged"],
      waiting: ["request held", "not checked", "not sent"],
      counted: ["passed", "new token", "+1 committed"],
      deduped: ["passed", "token found", "unchanged"],
    },
    recent: "recent visitor tokens",
    window: "dedupe window · 24h",
    empty: "No token yet. The next visible read will count.",
    active: "active",
    expired: "expired",
    hoursOld: "h old",
    results: {
      idle: {
        title: "Ready for a reader",
        detail: "A static article already exists; the live transaction has not run.",
      },
      waiting: {
        title: "No request while hidden",
        detail: "Bring the tab forward to release the queued read.",
      },
      counted: {
        title: "A new view was committed",
        detail: "No active token matched this browser, so SQLite stored the token and added one.",
      },
      deduped: {
        title: "The total stayed put",
        detail: "This browser already has an active token inside the 24-hour window.",
      },
    },
  },
  "pt-BR": {
    label: "Transação interativa de deduplicação de visualizações por 24 horas",
    eyebrow: "ARTIGO ESTÁTICO · BORDA DINÂMICA",
    title: "Apenas um número cruza a fronteira",
    staticSide: "gerado uma vez",
    article: "artigo MDX",
    articleParts: ["título", "data", "corpo"],
    runtimeSide: "runtime",
    totalViews: "visualizações",
    clock: "relógio do servidor",
    visible: "aba visível",
    hidden: "aba oculta",
    visitor: "cookie do navegador",
    visitorHint: "Escolha um navegador anônimo",
    read: "ler artigo",
    readPending: "leitura na fila",
    advance: "Avançar o tempo",
    reset: "reiniciar laboratório",
    transaction: "última transação",
    steps: ["controle de visibilidade", "token de 24h", "total permanente"],
    stepValues: {
      idle: ["pronto", "não consultado", "sem alteração"],
      waiting: ["requisição retida", "não consultado", "não enviado"],
      counted: ["liberado", "novo token", "+1 confirmado"],
      deduped: ["liberado", "token encontrado", "sem alteração"],
    },
    recent: "tokens recentes de visitantes",
    window: "janela de deduplicação · 24h",
    empty: "Nenhum token ainda. A próxima leitura visível será contada.",
    active: "ativo",
    expired: "vencido",
    hoursOld: "h atrás",
    results: {
      idle: {
        title: "Pronto para um leitor",
        detail: "O artigo estático já existe; a transação dinâmica ainda não rodou.",
      },
      waiting: {
        title: "Nenhuma requisição com a aba oculta",
        detail: "Traga a aba para a frente para liberar a leitura na fila.",
      },
      counted: {
        title: "Uma nova visualização foi confirmada",
        detail:
          "Nenhum token ativo correspondeu ao navegador, então o SQLite guardou o token e somou um.",
      },
      deduped: {
        title: "O total permaneceu igual",
        detail: "Este navegador já tem um token ativo dentro da janela de 24 horas.",
      },
    },
  },
} as const;

const VISITORS: Visitor[] = ["A", "B"];
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
  const [transactionVisitor, setTransactionVisitor] = createSignal<Visitor>("A");
  const [result, setResult] = createSignal<Result>("idle");

  const activeRows = createMemo(() => recent().filter((row) => clock() - row.at <= WINDOW_HOURS));
  const outcome = createMemo(() => text().results[result()]);
  const stepValues = createMemo(() => text().stepValues[result()]);

  function write(activeVisitor: Visitor) {
    const retained = activeRows();
    setTransactionVisitor(activeVisitor);
    setRecent(retained);

    if (retained.some((row) => row.visitor === activeVisitor)) {
      setResult("deduped");
      return;
    }

    setRecent([...retained, { visitor: activeVisitor, at: clock() }]);
    setTotal((value) => value + 1);
    setResult("counted");
  }

  function openArticle() {
    setTransactionVisitor(visitor());
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
    setTransactionVisitor("A");
    setResult("idle");
  }

  return (
    <LabFrame id="view-counter-transaction" label={text().label} class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-2xl border border-fuchsia-200/15 bg-[#0c0910] shadow-2xl shadow-fuchsia-950/20">
        <div class="border-b border-white/10 bg-[radial-gradient(circle_at_85%_0%,rgba(217,70,239,0.16),transparent_42%)] p-4 sm:p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-mono text-[9px] tracking-[0.2em] text-fuchsia-300/65 uppercase">
                {text().eyebrow}
              </p>
              <h3 class="mt-1 max-w-md text-base font-medium text-slate-100 sm:text-lg">
                {text().title}
              </h3>
            </div>
            <button
              type="button"
              onClick={reset}
              class="shrink-0 rounded-full border border-white/10 px-2.5 py-1.5 font-mono text-[9px] text-slate-500 transition hover:border-white/20 hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:outline-none motion-reduce:transition-none"
            >
              <span aria-hidden="true">↺</span> {text().reset}
            </button>
          </div>

          <div class="mt-4 grid overflow-hidden rounded-xl border border-white/10 bg-black/20 sm:grid-cols-2">
            <div class="relative p-3.5 sm:border-r sm:border-dashed sm:border-white/15">
              <p class="font-mono text-[8px] tracking-widest text-sky-300/60 uppercase">
                Astro · {text().staticSide}
              </p>
              <p class="mt-2 text-sm font-medium text-slate-200">{text().article}</p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <For each={text().articleParts}>
                  {(part) => (
                    <span class="rounded-md bg-sky-300/8 px-2 py-1 font-mono text-[9px] text-sky-200/60">
                      {part}
                    </span>
                  )}
                </For>
              </div>
              <span
                aria-hidden="true"
                class="absolute top-1/2 -right-2.5 z-10 hidden size-5 -translate-y-1/2 place-items-center rounded-full border border-fuchsia-200/20 bg-[#17101b] font-mono text-[10px] text-fuchsia-200 sm:grid"
              >
                →
              </span>
            </div>

            <div class="flex items-center justify-between gap-4 border-t border-dashed border-white/15 p-3.5 sm:border-t-0">
              <div>
                <p class="font-mono text-[8px] tracking-widest text-fuchsia-300/60 uppercase">
                  SQLite · {text().runtimeSide}
                </p>
                <p class="mt-1 font-mono text-[9px] text-slate-500">{text().totalViews}</p>
              </div>
              <output
                class="font-mono text-4xl tracking-tight text-fuchsia-100 tabular-nums sm:text-5xl"
                aria-label={`${total()} ${text().totalViews}`}
              >
                {total()}
              </output>
            </div>
          </div>
        </div>

        <div class="grid gap-px bg-white/10 lg:grid-cols-[0.88fr_1.12fr]">
          <div class="bg-[#0c0910] p-4 sm:p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-mono text-[9px] tracking-widest text-slate-500 uppercase">
                  {text().clock}
                </p>
                <p class="mt-0.5 font-mono text-sm text-slate-300 tabular-nums">T+{clock()}h</p>
              </div>
              <button
                type="button"
                onClick={toggleVisibility}
                aria-pressed={visible()}
                class={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 font-mono text-[9px] transition focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:outline-none motion-reduce:transition-none ${
                  visible()
                    ? "border-emerald-300/25 bg-emerald-300/8 text-emerald-200"
                    : "border-amber-300/25 bg-amber-300/8 text-amber-200"
                }`}
              >
                <span
                  aria-hidden="true"
                  class={`size-1.5 rounded-full ${visible() ? "bg-emerald-300" : "bg-amber-300"}`}
                />
                {visible() ? text().visible : text().hidden}
              </button>
            </div>

            <fieldset class="mt-5">
              <legend class="font-mono text-[9px] tracking-widest text-slate-500 uppercase">
                {text().visitor}
              </legend>
              <p class="mt-1 text-[11px] text-slate-500">{text().visitorHint}</p>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <For each={VISITORS}>
                  {(choice) => (
                    <button
                      type="button"
                      onClick={() => setVisitor(choice)}
                      aria-pressed={visitor() === choice}
                      class={`min-h-10 rounded-lg border font-mono text-[10px] transition focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:outline-none motion-reduce:transition-none ${
                        visitor() === choice
                          ? "border-fuchsia-300/50 bg-fuchsia-300/12 text-fuchsia-100"
                          : "border-white/10 bg-white/[0.025] text-slate-500 hover:border-white/20 hover:text-slate-300"
                      }`}
                    >
                      <span aria-hidden="true" class="mr-1.5">
                        {choice === "A" ? "◒" : "◐"}
                      </span>
                      {text().visitor} {choice}
                    </button>
                  )}
                </For>
              </div>
            </fieldset>

            <button
              type="button"
              onClick={openArticle}
              disabled={result() === "waiting"}
              class="mt-3 min-h-11 w-full rounded-lg bg-fuchsia-300 px-4 font-mono text-[10px] font-semibold tracking-wide text-slate-950 transition hover:bg-fuchsia-200 focus-visible:ring-2 focus-visible:ring-fuchsia-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0910] focus-visible:outline-none active:translate-y-px disabled:cursor-wait disabled:bg-amber-200 disabled:text-amber-950 motion-reduce:transition-none"
            >
              {result() === "waiting" ? text().readPending : text().read}
              <span aria-hidden="true" class="ml-2">
                →
              </span>
            </button>

            <div class="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
              <span class="font-mono text-[9px] tracking-wider text-slate-500 uppercase">
                {text().advance}
              </span>
              <div class="flex gap-1.5">
                <For each={[6, 25]}>
                  {(hours) => (
                    <button
                      type="button"
                      onClick={() => setClock((value) => value + hours)}
                      class="min-h-8 rounded-md border border-white/10 px-2.5 font-mono text-[9px] text-slate-400 transition hover:border-fuchsia-300/30 hover:text-fuchsia-200 focus-visible:ring-2 focus-visible:ring-fuchsia-300 focus-visible:outline-none motion-reduce:transition-none"
                      aria-label={`${text().advance}: ${hours}h`}
                    >
                      +{hours}h
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>

          <div class="bg-[#100b13] p-4 sm:p-5">
            <p class="font-mono text-[9px] tracking-widest text-slate-500 uppercase">
              {text().transaction} · {text().visitor} {transactionVisitor()}
            </p>

            <ol class="mt-3 grid grid-cols-3 gap-1.5" aria-label={text().transaction}>
              <For each={text().steps}>
                {(step, index) => (
                  <li class="relative rounded-lg border border-white/8 bg-black/20 p-2.5">
                    <div class="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        class={`grid size-4 shrink-0 place-items-center rounded-full font-mono text-[8px] ${
                          result() === "counted"
                            ? "bg-emerald-300/15 text-emerald-200"
                            : result() === "deduped"
                              ? "bg-sky-300/15 text-sky-200"
                              : result() === "waiting" && index() === 0
                                ? "bg-amber-300/15 text-amber-200"
                                : "bg-white/5 text-slate-500"
                        }`}
                      >
                        {index() + 1}
                      </span>
                      <span class="min-w-0 font-mono text-[8px] leading-tight tracking-wide text-slate-500 uppercase sm:text-[9px]">
                        {step}
                      </span>
                    </div>
                    <p class="mt-2 font-mono text-[9px] leading-tight text-slate-300">
                      {stepValues()[index()]}
                    </p>
                  </li>
                )}
              </For>
            </ol>

            <div
              class={`mt-3 rounded-lg border p-3 ${
                result() === "counted"
                  ? "border-emerald-300/20 bg-emerald-300/[0.06]"
                  : result() === "deduped"
                    ? "border-sky-300/20 bg-sky-300/[0.06]"
                    : result() === "waiting"
                      ? "border-amber-300/20 bg-amber-300/[0.06]"
                      : "border-white/8 bg-white/[0.025]"
              }`}
              aria-live="polite"
              aria-atomic="true"
            >
              <p class="text-xs font-medium text-slate-200">{outcome().title}</p>
              <p class="mt-1 text-[10px] leading-relaxed text-slate-500">{outcome().detail}</p>
            </div>

            <div class="mt-5 flex items-end justify-between gap-3">
              <div>
                <p class="font-mono text-[9px] tracking-widest text-slate-500 uppercase">
                  {text().recent}
                </p>
                <p class="mt-0.5 font-mono text-[8px] text-fuchsia-300/50">{text().window}</p>
              </div>
              <span class="font-mono text-[9px] text-slate-500 tabular-nums">
                {activeRows().length}/2 {text().active}
              </span>
            </div>

            <div class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Show
                when={recent().length > 0}
                fallback={
                  <p class="col-span-full rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[10px] leading-relaxed text-slate-500">
                    {text().empty}
                  </p>
                }
              >
                <For each={recent()}>
                  {(row) => {
                    const age = () => clock() - row.at;
                    const expired = () => age() > WINDOW_HOURS;
                    const life = () => Math.max(0, 100 - (age() / (WINDOW_HOURS + 1)) * 100);
                    return (
                      <div
                        class={`overflow-hidden rounded-lg border bg-black/20 ${
                          expired() ? "border-amber-300/15" : "border-fuchsia-300/15"
                        }`}
                      >
                        <div class="flex items-center justify-between gap-2 px-2.5 py-2">
                          <span class="font-mono text-[9px] text-slate-300">
                            {text().visitor} {row.visitor}
                          </span>
                          <span
                            class={`font-mono text-[8px] ${expired() ? "text-amber-300/70" : "text-fuchsia-200/60"}`}
                          >
                            {age()}
                            {text().hoursOld} · {expired() ? text().expired : text().active}
                          </span>
                        </div>
                        <div class="h-0.5 bg-white/5" aria-hidden="true">
                          <div
                            class={`h-full transition-[width] duration-300 motion-reduce:transition-none ${
                              expired() ? "bg-amber-300/35" : "bg-fuchsia-300/60"
                            }`}
                            style={{ width: `${life()}%` }}
                          />
                        </div>
                      </div>
                    );
                  }}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </LabFrame>
  );
}
