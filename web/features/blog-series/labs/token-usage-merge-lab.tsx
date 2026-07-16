import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { resolveLabLocale, selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type TokenUsageMergeLabProps = { locale?: LabLocale };
type Provider = "codex" | "claude" | "pi";
type SourceId = "laptop" | "server";
type SourceWindow = {
  provider: Provider;
  sourceId: SourceId;
  totalTokens: number;
  generatedHoursAgo: number;
};

const copy = {
  "en-US": {
    label: "Token snapshot merge console",
    public: "public / 30d",
    age: "age",
    tokens: "tokens",
    sync: "sync",
    fresh: "fresh",
    stale: "stale",
    hidden: "stale source masked by newest",
    added: "new source added",
    replaced: "same source replaced",
    hours: "h",
  },
  "pt-BR": {
    label: "Console de combinação dos retratos de tokens",
    public: "público / 30d",
    age: "idade",
    tokens: "tokens",
    sync: "sincronizar",
    fresh: "atual",
    stale: "antigo",
    hidden: "origem antiga mascarada pela mais nova",
    added: "nova origem adicionada",
    replaced: "mesma origem substituída",
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
  const [lastAction, setLastAction] = createSignal<"added" | "replaced">();

  const compact = createMemo(
    () =>
      new Intl.NumberFormat(locale(), {
        notation: "compact",
        maximumFractionDigits: 1,
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
  const newestAge = createMemo(() =>
    Math.min(...sources().map((source) => source.generatedHoursAgo)),
  );
  const aggregateIsStale = createMemo(() => newestAge() > STALE_AFTER_HOURS);
  const maskedCount = createMemo(
    () =>
      sources().filter((source) => source.generatedHoursAgo > STALE_AFTER_HOURS).length *
      Number(!aggregateIsStale()),
  );
  const selectedExists = createMemo(() =>
    sources().some((source) => source.provider === provider() && source.sourceId === sourceId()),
  );

  function sync() {
    const key = `${provider()}/${sourceId()}`;
    const action = selectedExists() ? "replaced" : "added";
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

  return (
    <LabFrame id="token-usage-source-merge" label={text().label} class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-xl border border-slate-200/15 bg-[#0b0d13] shadow-xl shadow-black/20">
        <div class="p-3">
          <div class="flex items-end justify-between gap-3">
            <div>
              <p class="font-mono text-[8px] tracking-widest text-slate-600 uppercase">
                {text().public}
              </p>
              <output class="font-mono text-2xl text-slate-100">
                {compact().format(aggregateTotal())}
              </output>
            </div>
            <div
              class={`flex items-center gap-1.5 font-mono text-[9px] ${
                aggregateIsStale() ? "text-amber-300" : "text-emerald-300"
              }`}
            >
              <span
                class={`size-1.5 rounded-full ${
                  aggregateIsStale() ? "bg-amber-300" : "animate-pulse bg-emerald-300"
                }`}
              />
              {aggregateIsStale() ? text().stale : text().fresh} · {newestAge()}
              {text().hours}
            </div>
          </div>

          <div class="mt-2 flex h-5 overflow-hidden rounded-sm bg-slate-900">
            <For each={providerTotals()}>
              {(entry) => (
                <div
                  class="flex min-w-0 items-center justify-center overflow-hidden font-mono text-[8px] font-bold text-slate-950 transition-[width] duration-300"
                  style={{
                    width: `${aggregateTotal() === 0 ? 0 : (entry.total / aggregateTotal()) * 100}%`,
                    "background-color": providerColors[entry.provider],
                  }}
                  title={`${entry.provider}: ${compact().format(entry.total)}`}
                >
                  <span class="truncate px-1">{entry.provider}</span>
                </div>
              )}
            </For>
          </div>

          <ul class="mt-2 grid gap-1 sm:grid-cols-2">
            <For each={sources()}>
              {(source) => {
                const key = `${source.provider}/${source.sourceId}`;
                const stale = source.generatedHoursAgo > STALE_AFTER_HOURS;
                return (
                  <li
                    class={`flex items-center gap-2 rounded border px-2 py-1.5 font-mono text-[9px] transition ${
                      lastKey() === key
                        ? "border-white/40 bg-white/10"
                        : "border-slate-200/10 bg-slate-950/45"
                    }`}
                  >
                    <span
                      class="size-1.5 shrink-0 rounded-full"
                      style={{ "background-color": providerColors[source.provider] }}
                    />
                    <span class="min-w-0 flex-1 truncate text-slate-400">{key}</span>
                    <span class="text-slate-200">{compact().format(source.totalTokens)}</span>
                    <span class={stale ? "text-amber-400/70" : "text-emerald-400/70"}>
                      {source.generatedHoursAgo}
                      {text().hours}
                    </span>
                  </li>
                );
              }}
            </For>
          </ul>

          <Show when={maskedCount() > 0}>
            <p class="mt-2 font-mono text-[9px] text-amber-300/65">
              ⚠ {maskedCount()}× {text().hidden}
            </p>
          </Show>
        </div>

        <div class="grid gap-2 border-t border-slate-200/10 bg-slate-950/65 p-3 sm:grid-cols-[auto_auto_1fr_1fr_auto] sm:items-end">
          <label class="font-mono text-[8px] tracking-wider text-slate-600 uppercase">
            provider
            <select
              value={provider()}
              onChange={(event) => setProvider(event.currentTarget.value as Provider)}
              class="mt-1 block h-7 rounded border border-slate-700 bg-slate-900 px-1.5 font-mono text-[10px] text-slate-200"
            >
              <For each={PROVIDERS}>{(choice) => <option value={choice}>{choice}</option>}</For>
            </select>
          </label>
          <label class="font-mono text-[8px] tracking-wider text-slate-600 uppercase">
            source
            <select
              value={sourceId()}
              onChange={(event) => setSourceId(event.currentTarget.value as SourceId)}
              class="mt-1 block h-7 rounded border border-slate-700 bg-slate-900 px-1.5 font-mono text-[10px] text-slate-200"
            >
              <For each={SOURCES}>{(choice) => <option value={choice}>{choice}</option>}</For>
            </select>
          </label>
          <label class="font-mono text-[8px] tracking-wider text-slate-600 uppercase">
            <span class="flex justify-between gap-2">
              {text().tokens} <output>{compact().format(totalTokens())}</output>
            </span>
            <input
              type="range"
              min="0"
              max="300000"
              step="10000"
              value={totalTokens()}
              onInput={(event) => setTotalTokens(event.currentTarget.valueAsNumber)}
              class="mt-2 block h-2 w-full accent-sky-400"
            />
          </label>
          <label class="font-mono text-[8px] tracking-wider text-slate-600 uppercase">
            <span class="flex justify-between gap-2">
              {text().age}{" "}
              <output>
                {generatedHoursAgo()}
                {text().hours}
              </output>
            </span>
            <input
              type="range"
              min="0"
              max="12"
              value={generatedHoursAgo()}
              onInput={(event) => setGeneratedHoursAgo(event.currentTarget.valueAsNumber)}
              class="mt-2 block h-2 w-full accent-sky-400"
            />
          </label>
          <button
            type="button"
            onClick={sync}
            class="h-8 rounded bg-slate-100 px-3 font-mono text-[9px] font-bold text-slate-950"
          >
            {selectedExists() ? "↻" : "+"} {text().sync}
          </button>
        </div>

        <Show when={lastAction()}>
          {(action) => (
            <p
              class="border-t border-slate-200/10 px-3 py-1.5 font-mono text-[9px] text-slate-500"
              aria-live="polite"
            >
              {action() === "replaced" ? "↻" : "+"} {lastKey()} · {text()[action()]}
            </p>
          )}
        </Show>
      </div>
    </LabFrame>
  );
}
