import { For, createMemo, createSignal } from "solid-js";
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
    label: "Replaceable token-source merge simulator",
    provider: "provider",
    source: "source",
    tokens: "tokens",
    age: "age",
    add: "add source",
    replace: "replace source",
    apply: "apply sync",
    reset: "reset",
    stored: "stored total",
    preview: "after sync",
    sources: "private sources",
    fresh: "fresh",
    stale: "stale",
    blind: (count: number) =>
      `${count} stale source${count === 1 ? " is" : "s are"} hidden by the fresh aggregate flag.`,
    boundary: "Public output keeps provider totals; source IDs and sessions stay private.",
    result: (action: string, key: string) => `${key} was ${action}.`,
  },
  "pt-BR": {
    label: "Simulador de combinação de origens substituíveis de tokens",
    provider: "provedor",
    source: "origem",
    tokens: "tokens",
    age: "idade",
    add: "somar origem",
    replace: "substituir origem",
    apply: "aplicar sync",
    reset: "reiniciar",
    stored: "total armazenado",
    preview: "após o sync",
    sources: "origens privadas",
    fresh: "atual",
    stale: "desatualizada",
    blind: (count: number) =>
      `${count} origem${count === 1 ? " antiga fica" : "ens antigas ficam"} oculta${count === 1 ? "" : "s"} pelo estado atual do conjunto.`,
    boundary: "A saída pública mantém totais por provedor; IDs e sessões ficam privados.",
    result: (action: string, key: string) => `${key}: ${action}.`,
  },
} as const;

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
  const text = () => selectLabCopy(props.locale, copy);
  const locale = () => resolveLabLocale(props.locale);
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
    <LabFrame id="token-usage-source-merge" label={text().label} class="mx-auto max-w-2xl">
      <div class="border-y border-white/10 py-4">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label class="font-mono text-[8px] text-slate-600">
            {text().provider}
            <select
              value={provider()}
              onChange={(event) => setProvider(event.currentTarget.value as Provider)}
              class="mt-1 block w-full bg-transparent py-1 font-mono text-[10px] text-slate-300 outline-none focus:text-sky-200"
            >
              <For each={providers}>{(choice) => <option value={choice}>{choice}</option>}</For>
            </select>
          </label>
          <label class="font-mono text-[8px] text-slate-600">
            {text().source}
            <select
              value={sourceId()}
              onChange={(event) => setSourceId(event.currentTarget.value as SourceId)}
              class="mt-1 block w-full bg-transparent py-1 font-mono text-[10px] text-slate-300 outline-none focus:text-sky-200"
            >
              <For each={sourceIds}>{(choice) => <option value={choice}>{choice}</option>}</For>
            </select>
          </label>
          <label class="font-mono text-[8px] text-slate-600">
            <span class="flex justify-between gap-2">
              <span>{text().tokens}</span>
              <output>{format().format(totalTokens())}</output>
            </span>
            <input
              type="range"
              min="0"
              max="300000"
              step="10000"
              value={totalTokens()}
              onInput={(event) => setTotalTokens(event.currentTarget.valueAsNumber)}
              class="mt-1 w-full accent-sky-300"
            />
          </label>
          <label class="font-mono text-[8px] text-slate-600">
            <span class="flex justify-between gap-2">
              <span>{text().age}</span>
              <output>{generatedHoursAgo()}h</output>
            </span>
            <input
              type="range"
              min="0"
              max="12"
              value={generatedHoursAgo()}
              onInput={(event) => setGeneratedHoursAgo(event.currentTarget.valueAsNumber)}
              class="mt-1 w-full accent-sky-300"
            />
          </label>
        </div>

        <div class="mt-5 flex flex-wrap items-baseline justify-between gap-3 font-mono">
          <div>
            <p class="text-[8px] text-slate-600">providerId + sourceId</p>
            <p class={`mt-1 text-sm ${tones[provider()]}`}>
              {provider()}/{sourceId()} · {selectedSource() ? text().replace : text().add}
            </p>
          </div>
          <p class="text-sm text-slate-300">
            {format().format(aggregateTotal())} <span class="text-slate-700">→</span>{" "}
            <span class="text-sky-200">{format().format(previewTotal())}</span>
          </p>
        </div>

        <div class="mt-4 flex gap-1">
          <button
            type="button"
            onClick={sync}
            class="rounded-full bg-sky-200 px-3 py-1.5 font-mono text-[9px] text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-100"
          >
            {text().apply}
          </button>
          <button
            type="button"
            onClick={reset}
            class="rounded-full px-3 py-1.5 font-mono text-[9px] text-slate-600 hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
          >
            {text().reset}
          </button>
        </div>

        <div class="mt-5">
          <p class="font-mono text-[8px] text-slate-600">{text().sources}</p>
          <ul class="mt-2 space-y-1">
            <For each={sources()}>
              {(item) => {
                const stale = () => item.generatedHoursAgo > STALE_AFTER_HOURS;
                return (
                  <li class="flex items-center justify-between gap-3 font-mono text-[9px]">
                    <span class={tones[item.provider]}>
                      {item.provider}/{item.sourceId}
                    </span>
                    <span class="text-slate-500">{format().format(item.totalTokens)}</span>
                    <span class={stale() ? "text-amber-200/70" : "text-emerald-200/70"}>
                      {item.generatedHoursAgo}h · {stale() ? text().stale : text().fresh}
                    </span>
                  </li>
                );
              }}
            </For>
          </ul>
        </div>

        <output class="mt-4 block min-h-4 text-xs text-slate-400" aria-live="polite">
          {message()}
          {message() && maskedStale() ? " " : ""}
          {maskedStale() ? text().blind(maskedStale()) : ""}
        </output>
        <p class="mt-2 font-mono text-[8px] text-slate-600">{text().boundary}</p>
      </div>
    </LabFrame>
  );
}
