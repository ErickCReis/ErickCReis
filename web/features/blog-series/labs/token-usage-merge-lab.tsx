import { For, Show, createMemo, createSignal } from "solid-js";
import { ConceptLab, LabCard, LabMetric } from "@web/features/blog-series/components/concept-lab";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type TokenUsageMergeLabProps = {
  locale?: LabLocale;
};

type Provider = "codex" | "claude" | "pi";
type SourceId = "laptop" | "server";

type SourceWindow = {
  provider: Provider;
  sourceId: SourceId;
  totalTokens: number;
  generatedHoursAgo: number;
};

type SyncResult = {
  kind: "added" | "replaced";
  provider: Provider;
  sourceId: SourceId;
  previousTokens?: number;
  totalTokens: number;
};

const copy = {
  "en-US": {
    eyebrow: "Interactive concept lab",
    title: "Merge snapshots without double-counting sessions",
    description:
      "Sync a provider/source pair. The persisted row is replaceable, while different sources are summed into the public provider total.",
    payload: "Incoming normalized payload",
    provider: "Provider ID",
    source: "Source ID",
    tokens: "Tokens in this 30-day window",
    generated: "Generated",
    hoursAgo: "h ago",
    sync: "Sync payload",
    reset: "Reset",
    persisted: "Private persisted source windows",
    storedRows: "Stored rows",
    noRows: "No synchronized sources.",
    current: "fresh source",
    stale: "stale source",
    publicSnapshot: "Derived public snapshot",
    providerTotals: "Provider totals",
    total30d: "30-day total",
    publicFreshness: "Aggregate freshness",
    fresh: "fresh",
    staleAggregate: "stale",
    initial: "The server identifies a stored window by the provider ID and source ID together.",
    added: (provider: Provider, sourceId: SourceId, total: string) =>
      `Added ${provider}/${sourceId}. Its ${total} tokens now contribute to that provider's segment.`,
    replaced: (provider: Provider, sourceId: SourceId, previous: string, total: string) =>
      `Replaced ${provider}/${sourceId}: ${previous} → ${total}. The old snapshot was removed, so a rerun did not double-count it.`,
    masked: (count: number) =>
      `${count} stale source${count === 1 ? " is" : "s are"} hidden by the newest generatedAt when freshness is reduced to one aggregate flag.`,
    freshnessClear: "The aggregate flag and every stored source currently agree about freshness.",
    privacy:
      "The public shape contains provider/day totals. Source IDs, detailed token categories, and individual source windows remain in the local store.",
  },
  "pt-BR": {
    eyebrow: "Laboratório interativo",
    title: "Combine retratos sem contar sessões duas vezes",
    description:
      "Sincronize um par de provedor e origem. O registro persistido é substituível, enquanto origens diferentes são somadas no total público do provedor.",
    payload: "Payload normalizado recebido",
    provider: "ID do provedor",
    source: "ID da origem",
    tokens: "Tokens nesta janela de 30 dias",
    generated: "Gerado há",
    hoursAgo: "h",
    sync: "Sincronizar payload",
    reset: "Reiniciar",
    persisted: "Janelas privadas persistidas por origem",
    storedRows: "Registros armazenados",
    noRows: "Nenhuma origem sincronizada.",
    current: "origem atualizada",
    stale: "origem desatualizada",
    publicSnapshot: "Retrato público derivado",
    providerTotals: "Totais por provedor",
    total30d: "Total de 30 dias",
    publicFreshness: "Atualização do agregado",
    fresh: "atualizado",
    staleAggregate: "desatualizado",
    initial:
      "O servidor identifica uma janela armazenada pela combinação do ID do provedor com o ID da origem.",
    added: (provider: Provider, sourceId: SourceId, total: string) =>
      `Adicionado ${provider}/${sourceId}. Seus ${total} tokens agora contribuem para o segmento daquele provedor.`,
    replaced: (provider: Provider, sourceId: SourceId, previous: string, total: string) =>
      `Substituído ${provider}/${sourceId}: ${previous} → ${total}. O retrato anterior foi removido, então a reexecução não o contou duas vezes.`,
    masked: (count: number) =>
      count === 1
        ? "1 origem desatualizada fica oculta pelo generatedAt mais novo quando a atualização é reduzida a um único indicador agregado."
        : `${count} origens desatualizadas ficam ocultas pelo generatedAt mais novo quando a atualização é reduzida a um único indicador agregado.`,
    freshnessClear:
      "O indicador agregado e todas as origens armazenadas concordam sobre a atualização neste momento.",
    privacy:
      "O formato público contém totais por provedor e dia. IDs das origens, categorias detalhadas de tokens e janelas individuais permanecem no armazenamento local.",
  },
} as const;

const PROVIDERS: Provider[] = ["codex", "claude", "pi"];
const SOURCE_IDS: SourceId[] = ["laptop", "server"];
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
  const [provider, setProvider] = createSignal<Provider>("codex");
  const [sourceId, setSourceId] = createSignal<SourceId>("laptop");
  const [totalTokens, setTotalTokens] = createSignal(180_000);
  const [generatedHoursAgo, setGeneratedHoursAgo] = createSignal(0);
  const [sources, setSources] = createSignal<SourceWindow[]>([...INITIAL_SOURCES]);
  const [result, setResult] = createSignal<SyncResult>();

  const numberFormatter = createMemo(
    () => new Intl.NumberFormat(props.locale === "pt-BR" ? "pt-BR" : "en-US"),
  );
  const compactFormatter = createMemo(
    () =>
      new Intl.NumberFormat(props.locale === "pt-BR" ? "pt-BR" : "en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
  );
  const sortedSources = createMemo(() =>
    [...sources()].sort(
      (left, right) =>
        left.provider.localeCompare(right.provider) || left.sourceId.localeCompare(right.sourceId),
    ),
  );
  const providerTotals = createMemo(() =>
    PROVIDERS.map((providerId) => ({
      provider: providerId,
      totalTokens: sources()
        .filter((source) => source.provider === providerId)
        .reduce((sum, source) => sum + source.totalTokens, 0),
    })).filter((entry) => entry.totalTokens > 0),
  );
  const aggregateTotal = createMemo(() =>
    providerTotals().reduce((sum, entry) => sum + entry.totalTokens, 0),
  );
  const newestGeneratedHoursAgo = createMemo(() =>
    sources().length === 0
      ? Number.POSITIVE_INFINITY
      : Math.min(...sources().map((source) => source.generatedHoursAgo)),
  );
  const aggregateIsStale = createMemo(() => newestGeneratedHoursAgo() > STALE_AFTER_HOURS);
  const staleSourceCount = createMemo(
    () => sources().filter((source) => source.generatedHoursAgo > STALE_AFTER_HOURS).length,
  );
  const hasMaskedStaleSources = createMemo(() => !aggregateIsStale() && staleSourceCount() > 0);

  function formatTokens(value: number) {
    return numberFormatter().format(value);
  }

  function syncPayload() {
    const currentProvider = provider();
    const currentSourceId = sourceId();
    const previous = sources().find(
      (source) => source.provider === currentProvider && source.sourceId === currentSourceId,
    );
    const nextSource: SourceWindow = {
      provider: currentProvider,
      sourceId: currentSourceId,
      totalTokens: totalTokens(),
      generatedHoursAgo: generatedHoursAgo(),
    };

    setSources((current) => [
      ...current.filter(
        (source) => source.provider !== currentProvider || source.sourceId !== currentSourceId,
      ),
      nextSource,
    ]);
    setResult({
      kind: previous ? "replaced" : "added",
      provider: currentProvider,
      sourceId: currentSourceId,
      previousTokens: previous?.totalTokens,
      totalTokens: nextSource.totalTokens,
    });
  }

  function reset() {
    setProvider("codex");
    setSourceId("laptop");
    setTotalTokens(180_000);
    setGeneratedHoursAgo(0);
    setSources([...INITIAL_SOURCES]);
    setResult(undefined);
  }

  const resultText = createMemo(() => {
    const current = result();
    if (!current) return text().initial;
    if (current.kind === "added") {
      return text().added(current.provider, current.sourceId, formatTokens(current.totalTokens));
    }
    return text().replaced(
      current.provider,
      current.sourceId,
      formatTokens(current.previousTokens ?? 0),
      formatTokens(current.totalTokens),
    );
  });

  return (
    <ConceptLab
      id="token-usage-source-merge"
      eyebrow={text().eyebrow}
      title={text().title}
      description={text().description}
    >
      <div class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <LabCard title={text().payload} accent="blue">
            <div class="space-y-3">
              <div>
                <p class="mb-2 font-mono text-xxs tracking-wider text-slate-400 uppercase">
                  {text().provider}
                </p>
                <div class="grid grid-cols-3 gap-2">
                  <For each={PROVIDERS}>
                    {(choice) => (
                      <button
                        type="button"
                        onClick={() => setProvider(choice)}
                        aria-pressed={provider() === choice}
                        class={`rounded-lg border px-2 py-2 font-mono text-xs transition ${
                          provider() === choice
                            ? "border-blue-300/45 bg-blue-400/15 text-blue-100"
                            : "border-slate-200/10 bg-slate-950/35 text-slate-400"
                        }`}
                      >
                        {choice}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <div>
                <p class="mb-2 font-mono text-xxs tracking-wider text-slate-400 uppercase">
                  {text().source}
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <For each={SOURCE_IDS}>
                    {(choice) => (
                      <button
                        type="button"
                        onClick={() => setSourceId(choice)}
                        aria-pressed={sourceId() === choice}
                        class={`rounded-lg border px-2 py-2 font-mono text-xs transition ${
                          sourceId() === choice
                            ? "border-blue-300/45 bg-blue-400/15 text-blue-100"
                            : "border-slate-200/10 bg-slate-950/35 text-slate-400"
                        }`}
                      >
                        {choice}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <label class="block text-xs text-slate-300">
                <span class="flex justify-between gap-3">
                  <span>{text().tokens}</span>
                  <output>{formatTokens(totalTokens())}</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="300000"
                  step="10000"
                  value={totalTokens()}
                  onInput={(event) => setTotalTokens(event.currentTarget.valueAsNumber)}
                  class="mt-2 w-full accent-blue-400"
                />
              </label>

              <label class="block text-xs text-slate-300">
                <span class="flex justify-between gap-3">
                  <span>{text().generated}</span>
                  <output>
                    {generatedHoursAgo()}
                    {text().hoursAgo}
                  </output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={generatedHoursAgo()}
                  onInput={(event) => setGeneratedHoursAgo(event.currentTarget.valueAsNumber)}
                  class="mt-2 w-full accent-blue-400"
                />
              </label>

              <button
                type="button"
                onClick={syncPayload}
                class="w-full rounded-lg border border-blue-300/35 bg-blue-400/15 px-3 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/25"
              >
                {text().sync}
              </button>
            </div>
          </LabCard>

          <LabCard title={text().persisted} accent="emerald">
            <div class="space-y-3">
              <LabMetric label={text().storedRows} value={sources().length} />
              <Show
                when={sortedSources().length > 0}
                fallback={<p class="text-xs text-slate-500">{text().noRows}</p>}
              >
                <ul class="space-y-1.5">
                  <For each={sortedSources()}>
                    {(source) => {
                      const stale = () => source.generatedHoursAgo > STALE_AFTER_HOURS;
                      return (
                        <li class="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-slate-200/10 bg-slate-950/40 px-3 py-2 text-xs">
                          <div>
                            <p class="font-mono text-slate-200">
                              {source.provider}/{source.sourceId}
                            </p>
                            <p
                              class={
                                stale() ? "mt-1 text-amber-300/75" : "mt-1 text-emerald-300/75"
                              }
                            >
                              {source.generatedHoursAgo}
                              {text().hoursAgo} · {stale() ? text().stale : text().current}
                            </p>
                          </div>
                          <span class="font-mono text-slate-300">
                            {formatTokens(source.totalTokens)}
                          </span>
                        </li>
                      );
                    }}
                  </For>
                </ul>
              </Show>
            </div>
          </LabCard>
        </div>

        <LabCard title={text().publicSnapshot} accent="amber">
          <div class="space-y-3">
            <dl class="grid gap-2 sm:grid-cols-2">
              <LabMetric label={text().total30d} value={formatTokens(aggregateTotal())} />
              <LabMetric
                label={text().publicFreshness}
                value={aggregateIsStale() ? text().staleAggregate : text().fresh}
                hint={
                  Number.isFinite(newestGeneratedHoursAgo())
                    ? `${newestGeneratedHoursAgo()}${text().hoursAgo}`
                    : undefined
                }
              />
            </dl>

            <div>
              <p class="mb-2 font-mono text-xxs tracking-wider text-slate-400 uppercase">
                {text().providerTotals}
              </p>
              <div class="flex h-8 overflow-hidden rounded-lg border border-slate-200/10 bg-slate-950/55">
                <For each={providerTotals()}>
                  {(entry) => (
                    <div
                      class="flex min-w-0 items-center justify-center px-2 font-mono text-xxs font-medium text-slate-950 transition-[width]"
                      style={`width:${aggregateTotal() === 0 ? 0 : (entry.totalTokens / aggregateTotal()) * 100}%;background-color:${providerColors[entry.provider]};`}
                      title={`${entry.provider}: ${formatTokens(entry.totalTokens)}`}
                    >
                      <span class="truncate">
                        {entry.provider} · {compactFormatter().format(entry.totalTokens)}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>

            <p
              class={`rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${
                hasMaskedStaleSources()
                  ? "border-amber-300/20 bg-amber-400/5 text-amber-100/80"
                  : "border-slate-200/10 bg-slate-950/35 text-slate-300/75"
              }`}
              aria-live="polite"
            >
              {hasMaskedStaleSources() ? text().masked(staleSourceCount()) : text().freshnessClear}
            </p>
          </div>
        </LabCard>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="max-w-3xl text-sm leading-relaxed text-slate-300/75" aria-live="polite">
            {resultText()}
          </p>
          <button
            type="button"
            onClick={reset}
            class="shrink-0 rounded-lg border border-slate-200/10 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-200/25 hover:text-slate-200"
          >
            {text().reset}
          </button>
        </div>

        <p class="text-xs leading-relaxed text-slate-400">{text().privacy}</p>
      </div>
    </ConceptLab>
  );
}
