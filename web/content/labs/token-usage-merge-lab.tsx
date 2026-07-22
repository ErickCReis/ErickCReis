import { For, createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type TokenUsageMergeLabProps = { locale?: Locale };
type Provider = "codex" | "claude" | "pi";
type SourceId = "laptop" | "server";
type SourceWindow = {
  provider: Provider;
  sourceId: SourceId;
  totalTokens: number;
};

function getCopy(locale: Locale) {
  return {
    label: t(locale, "Replaceable token-source merge simulator"),
    provider: t(locale, "provider"),
    source: t(locale, "source"),
    tokens: t(locale, "tokens"),
    add: t(locale, "add source"),
    replace: t(locale, "replace source"),
    apply: t(locale, "apply sync"),
    mergeKey: t(locale, "merge key"),
    publicSide: t(locale, "public aggregate"),
    boundary: t(locale, "Totals public; source IDs private."),
  };
}

const providers: Provider[] = ["codex", "claude", "pi"];
const sourceIds: SourceId[] = ["laptop", "server"];
const initialSources: SourceWindow[] = [
  { provider: "codex", sourceId: "laptop", totalTokens: 120_000 },
  { provider: "claude", sourceId: "laptop", totalTokens: 80_000 },
];

export function TokenUsageMergeLab(props: TokenUsageMergeLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const locale = () => resolveLocale(props.locale);
  const [provider, setProvider] = createSignal<Provider>("codex");
  const [sourceId, setSourceId] = createSignal<SourceId>("laptop");
  const [totalTokens, setTotalTokens] = createSignal(180_000);
  const [sources, setSources] = createSignal<SourceWindow[]>([...initialSources]);

  const format = createMemo(
    () => new Intl.NumberFormat(locale(), { notation: "compact", maximumFractionDigits: 1 }),
  );
  const selectedSource = createMemo(() =>
    sources().find((item) => item.provider === provider() && item.sourceId === sourceId()),
  );
  const aggregateTotal = createMemo(() =>
    sources().reduce((sum, item) => sum + item.totalTokens, 0),
  );

  function sync() {
    const incoming: SourceWindow = {
      provider: provider(),
      sourceId: sourceId(),
      totalTokens: totalTokens(),
    };

    setSources((current) => [
      ...current.filter(
        (item) => item.provider !== incoming.provider || item.sourceId !== incoming.sourceId,
      ),
      incoming,
    ]);
  }

  return (
    <section
      class="not-prose mx-auto my-10 max-w-xl"
      aria-label={text().label}
      data-concept-lab="token-usage-source-merge"
    >
      <div class="rounded-3xl bg-violet-300/[0.07] p-4 sm:p-6">
        <div class="flex items-center justify-between gap-4">
          <span class="font-mono text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
            {text().mergeKey}
          </span>
          <span
            class={`rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${
              selectedSource()
                ? "bg-amber-300/15 text-amber-200"
                : "bg-emerald-300/15 text-emerald-200"
            }`}
          >
            {selectedSource() ? text().replace : text().add}
          </span>
        </div>

        <div class="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div class="flex items-center rounded-xl bg-black/20 px-3 font-mono text-lg font-bold">
            <select
              aria-label={text().provider}
              value={provider()}
              onChange={(event) => setProvider(event.currentTarget.value as Provider)}
              class="appearance-none bg-transparent py-2.5 text-violet-100 outline-none"
            >
              <For each={providers}>{(choice) => <option value={choice}>{choice}</option>}</For>
            </select>
            <span class="px-1.5 text-violet-300/40">/</span>
            <select
              aria-label={text().source}
              value={sourceId()}
              onChange={(event) => setSourceId(event.currentTarget.value as SourceId)}
              class="appearance-none bg-transparent py-2.5 text-slate-200 outline-none"
            >
              <For each={sourceIds}>{(choice) => <option value={choice}>{choice}</option>}</For>
            </select>
          </div>

          <output class="font-mono text-4xl font-black tracking-[-0.08em] text-white">
            {format().format(totalTokens())}
          </output>
        </div>

        <label class="mt-6 block">
          <span class="sr-only">{text().tokens}</span>
          <input
            type="range"
            min="0"
            max="300000"
            step="10000"
            value={totalTokens()}
            onInput={(event) => setTotalTokens(event.currentTarget.valueAsNumber)}
            class="block h-1 w-full cursor-ew-resize accent-violet-300"
          />
        </label>

        <button
          type="button"
          onClick={sync}
          class="mt-6 w-full rounded-xl bg-violet-300 py-3 font-mono text-sm font-black uppercase tracking-[0.12em] text-violet-950 transition-colors hover:bg-violet-200 motion-reduce:transition-none"
        >
          {text().apply}
        </button>
      </div>

      <div class="mx-auto flex h-12 w-1/2 items-center" aria-hidden="true">
        <span class="h-px flex-1 bg-gradient-to-r from-transparent to-violet-300/60" />
        <span class="mx-2 text-lg text-violet-200">↓</span>
        <span class="h-px flex-1 bg-gradient-to-l from-transparent to-violet-300/60" />
      </div>

      <div class="text-center">
        <p class="font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          {text().publicSide}
        </p>
        <output
          class="mt-1 block font-mono text-5xl font-black tracking-[-0.08em] text-violet-100"
          aria-live="polite"
        >
          {format().format(aggregateTotal())}
        </output>
        <p class="mt-3 font-mono text-xs font-semibold text-slate-500">{text().boundary}</p>
      </div>
    </section>
  );
}
