import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { resolveLabLocale, selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type TokenUsageMergeLabProps = { locale?: LabLocale };
type Provider = "codex" | "claude" | "pi";
type SourceId = "laptop" | "server";
type MergeAction = "added" | "replaced";
type SourceWindow = {
  provider: Provider;
  sourceId: SourceId;
  totalTokens: number;
  generatedHoursAgo: number;
};

const copy = {
  "en-US": {
    label: "Replaceable token-source merge simulator",
    eyebrow: "Source-window merge lab",
    title: "One key decides: add or replace?",
    instruction: "Compose a sync payload, preview its effect, then write it into the source store.",
    incoming: "Incoming private snapshot",
    endpoint: "POST /internal/token-usage/sync",
    validated: "JSON · validated",
    mergeKey: "Merge key",
    keyHint: "providerId + sourceId",
    provider: "providerId",
    source: "sourceId",
    tokens: "30-day tokens",
    age: "Generated",
    hourAgo: "hour ago",
    hoursAgo: "hours ago",
    now: "now",
    decision: "Store decision",
    addSnapshot: "add new source",
    replaceSnapshot: "replace same source",
    oldWindow: "stored",
    newWindow: "incoming",
    publicImpact: "Public total after sync",
    apply: "Apply sync",
    reset: "Reset lab",
    publicProjection: "Public projection",
    publicWindow: "rolling 30 days",
    tokensUnit: "tokens",
    aggregateFreshness: "Aggregate freshness",
    fresh: "fresh",
    stale: "stale",
    newestWins: "newest source sets the flag",
    providerMix: "Provider mix",
    sourceStore: "Private source store",
    sourceCount: "source windows",
    freshnessBlindSpot: "Fresh aggregate, stale source",
    hiddenOne: "stale source is hidden by the aggregate freshness flag.",
    hiddenMany: "stale sources are hidden by the aggregate freshness flag.",
    boundary: "Public boundary",
    boundaryDetail:
      "Only totals by provider and day leave the server—not source IDs or session data.",
    added: "new source added",
    replaced: "same source replaced",
    aggregateNow: "aggregate is now",
    initial: "Try changing sourceId to see an additive merge.",
    hours: "h",
  },
  "pt-BR": {
    label: "Simulador de combinação de origens substituíveis de tokens",
    eyebrow: "Laboratório de combinação de janelas",
    title: "Uma chave decide: somar ou substituir?",
    instruction:
      "Monte um payload de sincronização, antecipe seu efeito e grave-o no armazenamento de origens.",
    incoming: "Retrato privado recebido",
    endpoint: "POST /internal/token-usage/sync",
    validated: "JSON · validado",
    mergeKey: "Chave de combinação",
    keyHint: "providerId + sourceId",
    provider: "providerId",
    source: "sourceId",
    tokens: "Tokens em 30 dias",
    age: "Gerado",
    hourAgo: "hora atrás",
    hoursAgo: "horas atrás",
    now: "agora",
    decision: "Decisão do armazenamento",
    addSnapshot: "adicionar nova origem",
    replaceSnapshot: "substituir a mesma origem",
    oldWindow: "armazenado",
    newWindow: "recebido",
    publicImpact: "Total público após o sync",
    apply: "Aplicar sync",
    reset: "Reiniciar laboratório",
    publicProjection: "Projeção pública",
    publicWindow: "janela móvel de 30 dias",
    tokensUnit: "tokens",
    aggregateFreshness: "Atualização do conjunto",
    fresh: "atual",
    stale: "desatualizado",
    newestWins: "a origem mais nova define o estado",
    providerMix: "Composição por provedor",
    sourceStore: "Armazenamento privado de origens",
    sourceCount: "janelas de origem",
    freshnessBlindSpot: "Conjunto atual, origem antiga",
    hiddenOne: "origem antiga fica oculta pelo estado de atualização do conjunto.",
    hiddenMany: "origens antigas ficam ocultas pelo estado de atualização do conjunto.",
    boundary: "Fronteira pública",
    boundaryDetail:
      "Somente os totais por provedor e dia saem do servidor — não os IDs das origens nem os dados das sessões.",
    added: "nova origem adicionada",
    replaced: "mesma origem substituída",
    aggregateNow: "o total agora é",
    initial: "Troque o sourceId para ver uma combinação aditiva.",
    hours: "h",
  },
} as const;

const PROVIDERS: Provider[] = ["claude", "codex", "pi"];
const SOURCES: SourceId[] = ["laptop", "server"];
const STALE_AFTER_HOURS = 3;
const INITIAL_SOURCES: SourceWindow[] = [
  { provider: "codex", sourceId: "laptop", totalTokens: 120_000, generatedHoursAgo: 7 },
  { provider: "claude", sourceId: "laptop", totalTokens: 80_000, generatedHoursAgo: 1 },
];
const providerColors: Record<Provider, string> = {
  claude: "#f5a96b",
  codex: "#7fb0ff",
  pi: "#86d9a6",
};

export function TokenUsageMergeLab(props: TokenUsageMergeLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const locale = () => resolveLabLocale(props.locale);
  const [provider, setProvider] = createSignal<Provider>("codex");
  const [sourceId, setSourceId] = createSignal<SourceId>("laptop");
  const [totalTokens, setTotalTokens] = createSignal(180_000);
  const [generatedHoursAgo, setGeneratedHoursAgo] = createSignal(0);
  const [sources, setSources] = createSignal<SourceWindow[]>([...INITIAL_SOURCES]);
  const [lastKey, setLastKey] = createSignal("");
  const [lastAction, setLastAction] = createSignal<MergeAction>();

  const compact = createMemo(
    () =>
      new Intl.NumberFormat(locale(), {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
  );
  const signedCompact = createMemo(
    () =>
      new Intl.NumberFormat(locale(), {
        notation: "compact",
        maximumFractionDigits: 1,
        signDisplay: "always",
      }),
  );
  const providerTotals = createMemo(() =>
    PROVIDERS.map((id) => ({
      provider: id,
      total: sources()
        .filter((source) => source.provider === id)
        .reduce((sum, source) => sum + source.totalTokens, 0),
    })).filter((entry) => entry.total > 0),
  );
  const aggregateTotal = createMemo(() =>
    providerTotals().reduce((sum, entry) => sum + entry.total, 0),
  );
  const selectedSource = createMemo(() =>
    sources().find((source) => source.provider === provider() && source.sourceId === sourceId()),
  );
  const previewTotal = createMemo(
    () => aggregateTotal() - (selectedSource()?.totalTokens ?? 0) + totalTokens(),
  );
  const previewDelta = createMemo(() => previewTotal() - aggregateTotal());
  const newestAge = createMemo(() =>
    Math.min(...sources().map((source) => source.generatedHoursAgo)),
  );
  const aggregateIsStale = createMemo(() => newestAge() > STALE_AFTER_HOURS);
  const staleSourceCount = createMemo(
    () => sources().filter((source) => source.generatedHoursAgo > STALE_AFTER_HOURS).length,
  );
  const maskedStaleCount = createMemo(() => (aggregateIsStale() ? 0 : staleSourceCount()));

  function sync() {
    const key = `${provider()}/${sourceId()}`;
    const action: MergeAction = selectedSource() ? "replaced" : "added";
    const incoming: SourceWindow = {
      provider: provider(),
      sourceId: sourceId(),
      totalTokens: totalTokens(),
      generatedHoursAgo: generatedHoursAgo(),
    };

    setSources((current) => [
      ...current.filter(
        (source) => source.provider !== incoming.provider || source.sourceId !== incoming.sourceId,
      ),
      incoming,
    ]);
    setLastKey(key);
    setLastAction(action);
  }

  function reset() {
    setProvider("codex");
    setSourceId("laptop");
    setTotalTokens(180_000);
    setGeneratedHoursAgo(0);
    setSources([...INITIAL_SOURCES]);
    setLastKey("");
    setLastAction();
  }

  return (
    <LabFrame id="token-usage-source-merge" label={text().label} class="mx-auto max-w-3xl">
      <div class="overflow-hidden rounded-2xl border border-slate-200/10 bg-[#080b12] shadow-2xl shadow-slate-950/35">
        <header class="relative overflow-hidden border-b border-slate-200/10 px-4 py-4 sm:px-5">
          <div
            class="pointer-events-none absolute -top-20 right-0 size-56 bg-[radial-gradient(circle,rgba(125,176,255,0.13),transparent_68%)]"
            aria-hidden="true"
          />
          <div class="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="font-mono text-[9px] tracking-[0.16em] text-sky-300/70 uppercase">
                {text().eyebrow}
              </p>
              <h3 class="mt-1 text-sm font-medium text-slate-100">{text().title}</h3>
            </div>
            <p class="max-w-md text-[11px] leading-relaxed text-slate-400">{text().instruction}</p>
          </div>
        </header>

        <div class="grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section class="border-b border-slate-200/10 p-4 sm:p-5 lg:border-r lg:border-b-0">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-mono text-[9px] tracking-[0.14em] text-slate-400 uppercase">
                  {text().incoming}
                </p>
                <code class="mt-1 block text-[9px] text-slate-600">{text().endpoint}</code>
              </div>
              <span class="rounded-full border border-slate-200/10 bg-slate-950/65 px-2 py-1 font-mono text-[9px] text-slate-400">
                {text().validated}
              </span>
            </div>

            <div class="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/5 p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-mono text-[8px] tracking-[0.14em] text-slate-500 uppercase">
                    {text().mergeKey}
                  </p>
                  <output class="mt-1 block font-mono text-sm text-sky-100">
                    {provider()}/{sourceId()}
                  </output>
                  <p class="mt-0.5 font-mono text-[8px] text-slate-600">{text().keyHint}</p>
                </div>
                <span
                  class={`rounded-full border px-2 py-1 font-mono text-[8px] font-semibold tracking-wide uppercase ${
                    selectedSource()
                      ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
                      : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                  }`}
                >
                  {selectedSource() ? text().replaceSnapshot : text().addSnapshot}
                </span>
              </div>
            </div>

            <fieldset class="mt-4 grid grid-cols-2 gap-3">
              <legend class="sr-only">{text().mergeKey}</legend>
              <label class="font-mono text-[9px] tracking-wider text-slate-500">
                {text().provider}
                <select
                  value={provider()}
                  onChange={(event) => setProvider(event.currentTarget.value as Provider)}
                  class="mt-1 block h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 font-mono text-[11px] text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                >
                  <For each={PROVIDERS}>{(choice) => <option value={choice}>{choice}</option>}</For>
                </select>
              </label>
              <label class="font-mono text-[9px] tracking-wider text-slate-500">
                {text().source}
                <select
                  value={sourceId()}
                  onChange={(event) => setSourceId(event.currentTarget.value as SourceId)}
                  class="mt-1 block h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 font-mono text-[11px] text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                >
                  <For each={SOURCES}>{(choice) => <option value={choice}>{choice}</option>}</For>
                </select>
              </label>
            </fieldset>

            <div class="mt-4 grid gap-4">
              <label for="token-merge-total" class="block">
                <span class="flex items-end justify-between gap-3">
                  <span class="font-mono text-[9px] tracking-wider text-slate-500">
                    {text().tokens}
                  </span>
                  <output for="token-merge-total" class="font-mono text-xs text-slate-200">
                    {compact().format(totalTokens())}
                  </output>
                </span>
                <input
                  id="token-merge-total"
                  type="range"
                  min="0"
                  max="300000"
                  step="10000"
                  value={totalTokens()}
                  onInput={(event) => setTotalTokens(event.currentTarget.valueAsNumber)}
                  class="mt-2 block w-full accent-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                />
              </label>

              <label for="token-merge-age" class="block">
                <span class="flex items-end justify-between gap-3">
                  <span class="font-mono text-[9px] tracking-wider text-slate-500">
                    {text().age}
                  </span>
                  <output
                    for="token-merge-age"
                    class={`font-mono text-xs ${
                      generatedHoursAgo() > STALE_AFTER_HOURS
                        ? "text-amber-200"
                        : "text-emerald-200"
                    }`}
                  >
                    {generatedHoursAgo() === 0
                      ? text().now
                      : `${generatedHoursAgo()} ${
                          generatedHoursAgo() === 1 ? text().hourAgo : text().hoursAgo
                        }`}
                  </output>
                </span>
                <input
                  id="token-merge-age"
                  type="range"
                  min="0"
                  max="12"
                  value={generatedHoursAgo()}
                  onInput={(event) => setGeneratedHoursAgo(event.currentTarget.valueAsNumber)}
                  class="mt-2 block w-full accent-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                />
              </label>
            </div>

            <div class="mt-4 rounded-xl border border-slate-200/10 bg-slate-950/55 p-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-mono text-[8px] tracking-[0.14em] text-slate-500 uppercase">
                    {text().decision}
                  </p>
                  <p class="mt-1 text-[11px] text-slate-300">
                    <span class="text-slate-500">{text().oldWindow}</span>{" "}
                    <span class="font-mono">
                      {selectedSource() ? compact().format(selectedSource()!.totalTokens) : "—"}
                    </span>{" "}
                    <span class="text-slate-600" aria-hidden="true">
                      →
                    </span>{" "}
                    <span class="text-slate-500">{text().newWindow}</span>{" "}
                    <span class="font-mono">{compact().format(totalTokens())}</span>
                  </p>
                </div>
                <span
                  class={`font-mono text-xs ${
                    previewDelta() < 0
                      ? "text-rose-200"
                      : previewDelta() > 0
                        ? "text-emerald-200"
                        : "text-slate-400"
                  }`}
                >
                  {signedCompact().format(previewDelta())}
                </span>
              </div>
              <div class="mt-3 flex items-end justify-between gap-3 border-t border-slate-200/8 pt-3">
                <span class="text-[10px] text-slate-500">{text().publicImpact}</span>
                <span class="font-mono text-sm text-slate-100">
                  {compact().format(aggregateTotal())}{" "}
                  <span class="text-slate-600" aria-hidden="true">
                    →
                  </span>{" "}
                  <strong class="font-medium text-sky-200">
                    {compact().format(previewTotal())}
                  </strong>
                </span>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={sync}
                class="min-h-10 flex-1 rounded-lg bg-sky-300 px-4 font-mono text-[10px] font-semibold text-slate-950 transition-colors hover:bg-sky-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 motion-reduce:transition-none"
              >
                {selectedSource() ? "↻" : "+"} {text().apply}
              </button>
              <button
                type="button"
                onClick={reset}
                class="min-h-10 rounded-lg border border-slate-200/10 px-3 font-mono text-[9px] text-slate-500 transition-colors hover:border-slate-200/25 hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 motion-reduce:transition-none"
              >
                {text().reset}
              </button>
            </div>

            <p class="mt-3 min-h-4 font-mono text-[9px] text-slate-500" aria-live="polite">
              <Show when={lastAction()} fallback={text().initial}>
                {(action) => (
                  <>
                    {action() === "replaced" ? "↻" : "+"} {lastKey()} · {text()[action()]} ·{" "}
                    {text().aggregateNow} {compact().format(aggregateTotal())}
                  </>
                )}
              </Show>
            </p>
          </section>

          <section class="flex min-w-0 flex-col bg-slate-950/25 p-4 sm:p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-mono text-[9px] tracking-[0.14em] text-slate-400 uppercase">
                  {text().publicProjection}
                </p>
                <p class="mt-1 text-[10px] text-slate-600">{text().publicWindow}</p>
              </div>
              <div class="text-right">
                <output class="font-mono text-2xl text-slate-100">
                  {compact().format(aggregateTotal())}
                </output>
                <p class="font-mono text-[8px] text-slate-600">{text().tokensUnit}</p>
              </div>
            </div>

            <div class="mt-4">
              <div class="flex items-end justify-between gap-3">
                <p class="font-mono text-[8px] tracking-[0.14em] text-slate-500 uppercase">
                  {text().providerMix}
                </p>
                <div
                  class={`flex items-center gap-1.5 font-mono text-[9px] ${
                    aggregateIsStale() ? "text-amber-200" : "text-emerald-200"
                  }`}
                >
                  <span
                    class={`size-1.5 rounded-full ${
                      aggregateIsStale()
                        ? "bg-amber-300"
                        : "animate-pulse bg-emerald-300 motion-reduce:animate-none"
                    }`}
                    aria-hidden="true"
                  />
                  {aggregateIsStale() ? text().stale : text().fresh} · {newestAge()}
                  {text().hours}
                </div>
              </div>
              <div
                class="mt-2 flex h-8 overflow-hidden rounded-lg bg-slate-900"
                role="img"
                aria-label={text().providerMix}
              >
                <For each={providerTotals()}>
                  {(entry) => (
                    <div
                      class="flex min-w-0 items-center justify-center overflow-hidden font-mono text-[9px] font-semibold text-slate-950 transition-[width] duration-300 motion-reduce:transition-none"
                      style={{
                        width: `${
                          aggregateTotal() === 0 ? 0 : (entry.total / aggregateTotal()) * 100
                        }%`,
                        "background-color": providerColors[entry.provider],
                      }}
                      title={`${entry.provider}: ${compact().format(entry.total)}`}
                    >
                      <span class="truncate px-1">{entry.provider}</span>
                    </div>
                  )}
                </For>
              </div>
              <ul class="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <For each={providerTotals()}>
                  {(entry) => (
                    <li class="flex items-center gap-1.5 font-mono text-[8px] text-slate-500">
                      <span
                        class="size-1.5 rounded-full"
                        style={{ "background-color": providerColors[entry.provider] }}
                        aria-hidden="true"
                      />
                      {entry.provider} {compact().format(entry.total)}
                    </li>
                  )}
                </For>
              </ul>
            </div>

            <div class="mt-5 flex items-end justify-between gap-3 border-b border-slate-200/8 pb-2">
              <div>
                <p class="font-mono text-[9px] tracking-[0.14em] text-slate-400 uppercase">
                  {text().sourceStore}
                </p>
                <p class="mt-0.5 text-[9px] text-slate-600">
                  {sources().length} {text().sourceCount}
                </p>
              </div>
              <p class="text-right font-mono text-[8px] text-slate-600">
                {text().aggregateFreshness}
                <br />
                {text().newestWins}
              </p>
            </div>

            <ul class="mt-2 grid gap-1.5">
              <For each={sources()}>
                {(source) => {
                  const key = `${source.provider}/${source.sourceId}`;
                  const stale = source.generatedHoursAgo > STALE_AFTER_HOURS;
                  return (
                    <li
                      class={`grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 rounded-lg border px-2.5 py-2 font-mono text-[9px] transition-colors motion-reduce:transition-none ${
                        lastKey() === key
                          ? "border-sky-200/30 bg-sky-300/8"
                          : "border-slate-200/8 bg-slate-950/40"
                      }`}
                    >
                      <span
                        class="size-2 shrink-0 rounded-full"
                        style={{ "background-color": providerColors[source.provider] }}
                        aria-hidden="true"
                      />
                      <span class="min-w-0 truncate text-slate-400">{key}</span>
                      <span class="text-slate-200">{compact().format(source.totalTokens)}</span>
                      <span
                        class={`rounded-full px-1.5 py-0.5 ${
                          stale ? "bg-amber-300/8 text-amber-300/75" : "text-emerald-300/75"
                        }`}
                      >
                        {source.generatedHoursAgo}
                        {text().hours} · {stale ? text().stale : text().fresh}
                      </span>
                    </li>
                  );
                }}
              </For>
            </ul>

            <Show when={maskedStaleCount() > 0}>
              <div class="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/6 px-3 py-2.5">
                <div class="flex gap-2">
                  <span class="mt-px text-amber-300" aria-hidden="true">
                    ◌
                  </span>
                  <div>
                    <p class="font-mono text-[9px] font-semibold text-amber-100">
                      {text().freshnessBlindSpot}
                    </p>
                    <p class="mt-0.5 text-[9px] leading-relaxed text-amber-200/60">
                      {maskedStaleCount()}×{" "}
                      {maskedStaleCount() === 1 ? text().hiddenOne : text().hiddenMany}
                    </p>
                  </div>
                </div>
              </div>
            </Show>

            <div class="mt-auto pt-4">
              <div class="flex gap-2 border-t border-dashed border-slate-200/10 pt-3">
                <span class="font-mono text-[9px] text-emerald-300/70" aria-hidden="true">
                  ↗
                </span>
                <p class="text-[9px] leading-relaxed text-slate-500">
                  <strong class="font-mono font-medium text-slate-400">{text().boundary}:</strong>{" "}
                  {text().boundaryDetail}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </LabFrame>
  );
}
