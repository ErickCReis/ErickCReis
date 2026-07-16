import { For, Show, createMemo, createSignal } from "solid-js";
import { ConceptLab, LabCard, LabMetric } from "@web/features/blog-series/components/concept-lab";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type ViewCounterLabProps = {
  locale?: LabLocale;
};

type Visitor = "A" | "B";

type RecentView = {
  visitor: Visitor;
  countedAt: number;
};

type TransactionResult = {
  kind: "counted" | "deduplicated" | "waiting";
  visitor: Visitor;
  pruned: number;
};

const copy = {
  "en-US": {
    eyebrow: "Interactive concept lab",
    title: "Run the 24-hour view transaction",
    description:
      "Act as two visitors, move the clock, and watch the permanent total diverge from the short-lived deduplication table.",
    browser: "Browser boundary",
    visible: "Document is visible",
    visitor: "Current visitor",
    clock: "Simulation clock",
    send: "Open article",
    waiting: "Waiting for visibility",
    advance6: "+6 hours",
    advance24: "+24 hours",
    reset: "Reset",
    database: "SQLite state",
    total: "Permanent total",
    recentRows: "Current / stored rows",
    recentTable: "Recent visitor rows",
    noRows: "No visitor has been counted yet.",
    age: "age",
    current: "inside 24 h",
    expired: "expired · pruned on next write",
    transaction: "Last attempt",
    initial:
      "Open the article to run the same decision the server makes inside its immediate transaction.",
    waitingResult:
      "The island holds the request. A preload or background tab does not reach the counter yet.",
    countedResult: (visitor: Visitor, pruned: number) =>
      `Visitor ${visitor} had no current row. The write pruned ${pruned}, upserted the visitor timestamp, and incremented the total.`,
    deduplicatedResult: (visitor: Visitor, pruned: number) =>
      `Visitor ${visitor} already had a current row. The write pruned ${pruned} and returned the existing total with counted: false.`,
    countedBadge: "counted: true",
    deduplicatedBadge: "counted: false",
    browserBadge: "request not sent",
    retention:
      "The aggregate survives indefinitely; visitor IDs remain correlatable only in the rolling dedupe table and are cleaned opportunistically.",
  },
  "pt-BR": {
    eyebrow: "Laboratório interativo",
    title: "Execute a transação de visualização de 24 horas",
    description:
      "Assuma o papel de dois visitantes, avance o relógio e observe o total permanente se separar da tabela temporária de deduplicação.",
    browser: "Fronteira do navegador",
    visible: "Documento está visível",
    visitor: "Visitante atual",
    clock: "Relógio da simulação",
    send: "Abrir artigo",
    waiting: "Aguardando visibilidade",
    advance6: "+6 horas",
    advance24: "+24 horas",
    reset: "Reiniciar",
    database: "Estado do SQLite",
    total: "Total permanente",
    recentRows: "Registros válidos / armazenados",
    recentTable: "Registros recentes de visitantes",
    noRows: "Nenhum visitante foi contado ainda.",
    age: "idade",
    current: "dentro de 24 h",
    expired: "vencido · removido na próxima gravação",
    transaction: "Última tentativa",
    initial:
      "Abra o artigo para executar a mesma decisão que o servidor toma dentro da transação imediata.",
    waitingResult:
      "A ilha retém a requisição. Um preload ou uma aba em segundo plano ainda não chega ao contador.",
    countedResult: (visitor: Visitor, pruned: number) =>
      `O visitante ${visitor} não tinha registro válido. A gravação removeu ${pruned}, atualizou o timestamp e incrementou o total.`,
    deduplicatedResult: (visitor: Visitor, pruned: number) =>
      `O visitante ${visitor} já tinha um registro válido. A gravação removeu ${pruned} e devolveu o total existente com counted: false.`,
    countedBadge: "counted: true",
    deduplicatedBadge: "counted: false",
    browserBadge: "requisição não enviada",
    retention:
      "O agregado sobrevive indefinidamente; os IDs de visitantes só permanecem correlacionáveis na tabela móvel de deduplicação e são removidos oportunisticamente.",
  },
} as const;

const WINDOW_HOURS = 24;
const INITIAL_TOTAL = 247;

export function ViewCounterLab(props: ViewCounterLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [visitor, setVisitor] = createSignal<Visitor>("A");
  const [pageVisible, setPageVisible] = createSignal(true);
  const [pending, setPending] = createSignal(false);
  const [pendingVisitor, setPendingVisitor] = createSignal<Visitor>();
  const [clock, setClock] = createSignal(0);
  const [total, setTotal] = createSignal(INITIAL_TOTAL);
  const [recentViews, setRecentViews] = createSignal<RecentView[]>([]);
  const [result, setResult] = createSignal<TransactionResult>();

  const activeRows = createMemo(
    () => recentViews().filter((row) => clock() - row.countedAt <= WINDOW_HOURS).length,
  );

  function runTransaction(activeVisitor: Visitor) {
    const currentRows = recentViews();
    const retainedRows = currentRows.filter((row) => clock() - row.countedAt <= WINDOW_HOURS);
    const pruned = currentRows.length - retainedRows.length;
    const alreadyCounted = retainedRows.some((row) => row.visitor === activeVisitor);

    if (alreadyCounted) {
      setRecentViews(retainedRows);
      setResult({ kind: "deduplicated", visitor: activeVisitor, pruned });
      return;
    }

    setRecentViews([...retainedRows, { visitor: activeVisitor, countedAt: clock() }]);
    setTotal((current) => current + 1);
    setResult({ kind: "counted", visitor: activeVisitor, pruned });
  }

  function attemptView() {
    if (!pageVisible()) {
      setPending(true);
      setPendingVisitor(visitor());
      setResult({ kind: "waiting", visitor: visitor(), pruned: 0 });
      return;
    }

    setPending(false);
    setPendingVisitor(undefined);
    runTransaction(visitor());
  }

  function changeVisibility(visible: boolean) {
    setPageVisible(visible);
    if (visible && pending()) {
      const queuedVisitor = pendingVisitor() ?? visitor();
      setPending(false);
      setPendingVisitor(undefined);
      runTransaction(queuedVisitor);
    }
  }

  function reset() {
    setVisitor("A");
    setPageVisible(true);
    setPending(false);
    setPendingVisitor(undefined);
    setClock(0);
    setTotal(INITIAL_TOTAL);
    setRecentViews([]);
    setResult(undefined);
  }

  const resultText = createMemo(() => {
    const current = result();
    if (!current) return text().initial;
    if (current.kind === "waiting") return text().waitingResult;
    if (current.kind === "counted") return text().countedResult(current.visitor, current.pruned);
    return text().deduplicatedResult(current.visitor, current.pruned);
  });

  const resultBadge = createMemo(() => {
    const current = result();
    if (!current) return null;
    if (current.kind === "waiting") return text().browserBadge;
    if (current.kind === "counted") return text().countedBadge;
    return text().deduplicatedBadge;
  });

  return (
    <ConceptLab
      id="view-counter-transaction"
      eyebrow={text().eyebrow}
      title={text().title}
      description={text().description}
    >
      <div class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <LabCard title={text().browser} accent="blue">
            <div class="space-y-3">
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200">
                <span>{text().visible}</span>
                <input
                  type="checkbox"
                  checked={pageVisible()}
                  onChange={(event) => changeVisibility(event.currentTarget.checked)}
                  class="size-4 accent-blue-400"
                />
              </label>

              <div>
                <p class="mb-2 font-mono text-xxs tracking-wider text-slate-400 uppercase">
                  {text().visitor}
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <For each={["A", "B"] as const}>
                    {(choice) => (
                      <button
                        type="button"
                        onClick={() => setVisitor(choice)}
                        aria-pressed={visitor() === choice}
                        class={`rounded-lg border px-3 py-2 font-mono text-sm transition ${
                          visitor() === choice
                            ? "border-blue-300/45 bg-blue-400/15 text-blue-100"
                            : "border-slate-200/10 bg-slate-950/35 text-slate-400 hover:border-slate-200/25"
                        }`}
                      >
                        {text().visitor} {choice}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <LabMetric label={text().clock} value={`T+${clock()}h`} />

              <button
                type="button"
                onClick={attemptView}
                class="w-full rounded-lg border border-blue-300/35 bg-blue-400/15 px-3 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/25"
              >
                {pending() ? text().waiting : text().send}
              </button>

              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setClock((current) => current + 6)}
                  class="rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-200/25"
                >
                  {text().advance6}
                </button>
                <button
                  type="button"
                  onClick={() => setClock((current) => current + 24)}
                  class="rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-200/25"
                >
                  {text().advance24}
                </button>
              </div>
            </div>
          </LabCard>

          <LabCard title={text().database} accent="emerald">
            <div class="space-y-3">
              <dl class="grid grid-cols-2 gap-2">
                <LabMetric label={text().total} value={total()} />
                <LabMetric
                  label={text().recentRows}
                  value={`${activeRows()} / ${recentViews().length}`}
                />
              </dl>

              <div class="rounded-lg border border-slate-200/10 bg-slate-950/35 p-3">
                <p class="font-mono text-xxs tracking-wider text-slate-400 uppercase">
                  {text().recentTable}
                </p>
                <Show
                  when={recentViews().length > 0}
                  fallback={<p class="mt-2 text-xs text-slate-500">{text().noRows}</p>}
                >
                  <ul class="mt-2 space-y-1.5">
                    <For each={recentViews()}>
                      {(row) => {
                        const rowAge = () => clock() - row.countedAt;
                        const expired = () => rowAge() > WINDOW_HOURS;
                        return (
                          <li class="flex items-center justify-between gap-3 rounded-md border border-slate-200/10 bg-slate-900/55 px-2.5 py-2 text-xs">
                            <span class="font-mono text-slate-200">
                              ct_visitor_{row.visitor.toLowerCase()}
                            </span>
                            <span class={expired() ? "text-amber-300/80" : "text-emerald-300/80"}>
                              {text().age} {rowAge()}h ·{" "}
                              {expired() ? text().expired : text().current}
                            </span>
                          </li>
                        );
                      }}
                    </For>
                  </ul>
                </Show>
              </div>
            </div>
          </LabCard>
        </div>

        <LabCard title={text().transaction} accent="amber">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div aria-live="polite">
              <Show when={resultBadge()}>
                {(badge) => (
                  <p class="mb-1 font-mono text-xxs tracking-wider text-amber-200/75 uppercase">
                    {badge()}
                  </p>
                )}
              </Show>
              <p class="max-w-3xl text-sm leading-relaxed text-slate-200/80">{resultText()}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              class="shrink-0 rounded-lg border border-slate-200/10 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-200/25 hover:text-slate-200"
            >
              {text().reset}
            </button>
          </div>
        </LabCard>

        <p class="text-xs leading-relaxed text-slate-400">{text().retention}</p>
      </div>
    </ConceptLab>
  );
}
