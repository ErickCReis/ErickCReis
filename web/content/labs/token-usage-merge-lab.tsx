import { For, createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type TokenUsageMergeLabProps = { locale?: Locale };
type Provider = "codex" | "claude" | "pi";
type SourceId = "laptop" | "server";
type SourceWindow = {
  provider: Provider;
  sourceId: SourceId;
  totalTokens: number;
  generatedHoursAgo: number;
};
function getCopy(locale: Locale) {
  return {
    label: t(locale, "Replaceable token-source merge simulator"),
    provider: t(locale, "provider"),
    source: t(locale, "source"),
    tokens: t(locale, "tokens"),
    age: t(locale, "age"),
    add: t(locale, "add source"),
    replace: t(locale, "replace source"),
    apply: t(locale, "apply sync"),
    reset: t(locale, "reset"),
    stored: t(locale, "stored total"),
    preview: t(locale, "after sync"),
    sources: t(locale, "private sources"),
    incoming: t(locale, "incoming window"),
    existing: t(locale, "existing window"),
    empty: t(locale, "no match"),
    mergeKey: t(locale, "merge key"),
    publicSide: t(locale, "public aggregate"),
    freshness: t(locale, "aggregate freshness"),
    fresh: t(locale, "fresh"),
    stale: t(locale, "stale"),
    blind: (count: number) =>
      (count === 1
        ? t(locale, "1 stale source is hidden by the fresh aggregate flag.")
        : t(locale, "{count} stale sources are hidden by the fresh aggregate flag.")
      ).replace("{count}", String(count)),
    boundary: t(
      locale,
      "Public output keeps provider totals; source IDs and sessions stay private.",
    ),
    result: (action: string, key: string) =>
      t(locale, "{key} was {action}.").replace("{key}", key).replace("{action}", action),
  };
}

const providers: Provider[] = ["codex", "claude", "pi"];
const sourceIds: SourceId[] = ["laptop", "server"];
const STALE_AFTER_HOURS = 3;
const initialSources: SourceWindow[] = [
  { provider: "codex", sourceId: "laptop", totalTokens: 120_000, generatedHoursAgo: 7 },
  { provider: "claude", sourceId: "laptop", totalTokens: 80_000, generatedHoursAgo: 1 },
];
const tones: Record<Provider, string> = {
  codex: "text-sky-200",
  claude: "text-orange-200",
  pi: "text-emerald-200",
};

export function TokenUsageMergeLab(props: TokenUsageMergeLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const locale = () => resolveLocale(props.locale);
  const [provider, setProvider] = createSignal<Provider>("codex");
  const [sourceId, setSourceId] = createSignal<SourceId>("laptop");
  const [totalTokens, setTotalTokens] = createSignal(180_000);
  const [generatedHoursAgo, setGeneratedHoursAgo] = createSignal(0);
  const [sources, setSources] = createSignal<SourceWindow[]>([...initialSources]);
  const [message, setMessage] = createSignal("");

  const format = createMemo(
    () => new Intl.NumberFormat(locale(), { notation: "compact", maximumFractionDigits: 1 }),
  );
  const selectedSource = createMemo(() =>
    sources().find((item) => item.provider === provider() && item.sourceId === sourceId()),
  );
  const aggregateTotal = createMemo(() =>
    sources().reduce((sum, item) => sum + item.totalTokens, 0),
  );
  const previewTotal = createMemo(
    () => aggregateTotal() - (selectedSource()?.totalTokens ?? 0) + totalTokens(),
  );
  const newestAge = createMemo(() => Math.min(...sources().map((item) => item.generatedHoursAgo)));
  const aggregateFresh = createMemo(() => newestAge() <= STALE_AFTER_HOURS);
  const maskedStale = createMemo(() =>
    aggregateFresh()
      ? sources().filter((item) => item.generatedHoursAgo > STALE_AFTER_HOURS).length
      : 0,
  );

  function sync() {
    const key = `${provider()}/${sourceId()}`;
    const action = selectedSource() ? text().replace : text().add;
    const incoming: SourceWindow = {
      provider: provider(),
      sourceId: sourceId(),
      totalTokens: totalTokens(),
      generatedHoursAgo: generatedHoursAgo(),
    };
    setSources((current) => [
      ...current.filter(
        (item) => item.provider !== incoming.provider || item.sourceId !== incoming.sourceId,
      ),
      incoming,
    ]);
    setMessage(text().result(action, key));
  }

  function reset() {
    setProvider("codex");
    setSourceId("laptop");
    setTotalTokens(180_000);
    setGeneratedHoursAgo(0);
    setSources([...initialSources]);
    setMessage("");
  }

  return (
    <section
      class="not-prose my-10 mx-auto max-w-2xl"
      aria-label={text().label}
      data-concept-lab="token-usage-source-merge"
    >
      <div class="border-l border-slate-700/70 pl-4 sm:pl-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="font-mono text-xs uppercase tracking-[0.24em] text-slate-600">
              {text().mergeKey}
            </p>
            <div class="mt-1 flex items-center font-mono text-lg">
              <select
                aria-label={text().provider}
                value={provider()}
                onChange={(event) => setProvider(event.currentTarget.value as Provider)}
                class={`appearance-none bg-transparent py-1 outline-none ${tones[provider()]} focus:underline`}
              >
                <For each={providers}>{(choice) => <option value={choice}>{choice}</option>}</For>
              </select>
              <span class="px-1 text-slate-700">/</span>
              <select
                aria-label={text().source}
                value={sourceId()}
                onChange={(event) => setSourceId(event.currentTarget.value as SourceId)}
                class="appearance-none bg-transparent py-1 text-slate-200 outline-none focus:underline"
              >
                <For each={sourceIds}>{(choice) => <option value={choice}>{choice}</option>}</For>
              </select>
            </div>
          </div>
          <span
            class={`border-b pb-1 font-mono text-xs uppercase tracking-widest ${
              selectedSource()
                ? "border-amber-300/40 text-amber-200"
                : "border-emerald-300/40 text-emerald-200"
            }`}
          >
            {selectedSource() ? text().replace : text().add}
          </span>
        </div>

        <div class="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div class="min-w-0">
            <p class="font-mono text-xs uppercase tracking-[0.2em] text-slate-600">
              {text().existing}
            </p>
            <p class="mt-2 font-mono text-2xl tabular-nums text-slate-500">
              {selectedSource() ? format().format(selectedSource()!.totalTokens) : "∅"}
            </p>
            <p class="mt-1 font-mono text-xs text-slate-700">
              {selectedSource()
                ? `${selectedSource()!.generatedHoursAgo}h · ${
                    selectedSource()!.generatedHoursAgo > STALE_AFTER_HOURS
                      ? text().stale
                      : text().fresh
                  }`
                : text().empty}
            </p>
          </div>

          <div class="hidden pb-2 font-mono text-lg text-slate-700 sm:block" aria-hidden="true">
            →
          </div>

          <div class="min-w-0 border-l border-sky-300/30 pl-4">
            <p class="font-mono text-xs uppercase tracking-[0.2em] text-sky-300/60">
              {text().incoming}
            </p>
            <div class="mt-2 flex items-baseline justify-between gap-3">
              <output class="font-mono text-2xl tabular-nums text-sky-100">
                {format().format(totalTokens())}
              </output>
              <output class="font-mono text-xs text-slate-500">{generatedHoursAgo()}h</output>
            </div>
            <label class="mt-3 block">
              <span class="sr-only">{text().tokens}</span>
              <input
                type="range"
                min="0"
                max="300000"
                step="10000"
                value={totalTokens()}
                onInput={(event) => setTotalTokens(event.currentTarget.valueAsNumber)}
                class="block h-1 w-full accent-sky-200"
              />
            </label>
            <label class="mt-3 flex items-center gap-3 font-mono text-xs text-slate-600">
              <span>{text().age}</span>
              <input
                type="range"
                min="0"
                max="12"
                value={generatedHoursAgo()}
                onInput={(event) => setGeneratedHoursAgo(event.currentTarget.valueAsNumber)}
                class="h-1 min-w-0 flex-1 accent-sky-200"
              />
            </label>
          </div>
        </div>

        <div class="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-dashed border-slate-800 py-3">
          <div class="font-mono tabular-nums">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-600">{text().publicSide}</p>
            <p class="mt-1 text-sm text-slate-500">
              {format().format(aggregateTotal())}
              <span class="mx-2 text-slate-700">−</span>
              {format().format(selectedSource()?.totalTokens ?? 0)}
              <span class="mx-2 text-slate-700">+</span>
              {format().format(totalTokens())}
              <span class="mx-2 text-slate-700">=</span>
              <strong class="font-normal text-sky-100">{format().format(previewTotal())}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={sync}
            class="border border-sky-200/60 px-3 py-1.5 font-mono text-xs text-sky-100 transition-colors hover:bg-sky-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-100"
          >
            {text().apply} →
          </button>
        </div>

        <div class="mt-5 grid gap-5 sm:grid-cols-[1fr_auto]">
          <div>
            <p class="font-mono text-xs uppercase tracking-[0.2em] text-slate-600">
              {text().sources}
            </p>
            <ul class="mt-2 space-y-1.5">
              <For each={sources()}>
                {(item) => {
                  const stale = () => item.generatedHoursAgo > STALE_AFTER_HOURS;
                  return (
                    <li class="grid grid-cols-[1fr_auto_auto] items-center gap-3 font-mono text-xs">
                      <span class={tones[item.provider]}>
                        {item.provider}
                        <span class="text-slate-700">/{item.sourceId}</span>
                      </span>
                      <span class="tabular-nums text-slate-500">
                        {format().format(item.totalTokens)}
                      </span>
                      <span
                        class={`flex items-center gap-1.5 tabular-nums ${
                          stale() ? "text-amber-200/70" : "text-emerald-200/70"
                        }`}
                        title={stale() ? text().stale : text().fresh}
                      >
                        <span
                          class={`h-1 w-1 rounded-full ${
                            stale() ? "bg-amber-300/70" : "bg-emerald-300/70"
                          }`}
                          aria-hidden="true"
                        />
                        {item.generatedHoursAgo}h
                      </span>
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
          <div class="sm:text-right">
            <p class="font-mono text-xs uppercase tracking-[0.2em] text-slate-600">
              {text().freshness}
            </p>
            <p
              class={`mt-2 font-mono text-xs ${
                aggregateFresh() ? "text-emerald-200" : "text-amber-200"
              }`}
            >
              {aggregateFresh() ? text().fresh : text().stale}
            </p>
          </div>
        </div>

        <output
          class="mt-5 block min-h-4 text-sm leading-relaxed text-slate-400"
          aria-live="polite"
        >
          {message()}
          {message() && maskedStale() ? " " : ""}
          {maskedStale() ? text().blind(maskedStale()) : ""}
        </output>
        <div class="mt-2 flex items-start justify-between gap-4 border-t border-slate-800/70 pt-3">
          <p class="max-w-md font-mono text-xs leading-relaxed text-slate-600">{text().boundary}</p>
          <button
            type="button"
            onClick={reset}
            class="font-mono text-xs text-slate-700 hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
          >
            {text().reset}
          </button>
        </div>
      </div>
    </section>
  );
}
