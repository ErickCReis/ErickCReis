import { Show, createMemo, createSignal } from "solid-js";
import { hashTranslationKey } from "@plugins/translate-runtime";
import { ConceptLab, LabCard, LabMetric } from "@web/features/blog-series/components/concept-lab";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type TranslationCatalogLabProps = {
  locale?: LabLocale;
};

type ExpressionKind = "static" | "dynamic";
type BuildResult = "idle" | "skipped" | "discovered" | "missing" | "translated";

const copy = {
  "en-US": {
    eyebrow: "Interactive concept lab",
    title: "Take a source string through the catalog loop",
    description:
      "Run builds to see which calls the ESTree collector can discover, how the real hash becomes a key, and when Portuguese reaches the output.",
    source: "Source call",
    sourceString: "English source string",
    staticCall: "Static literal",
    dynamicCall: "Dynamic expression",
    collector: "Collector",
    discovered: "Discovered",
    skipped: "Skipped",
    notRun: "Not run",
    hash: "Catalog hash",
    noHash: "no entry",
    catalog: "pt-BR catalog",
    translation: "Portuguese override",
    translationPlaceholder: "Add the translation after discovery",
    lockedTranslation: "Run the discovery build first.",
    build: "Run production build",
    buildNumber: "Build passes",
    output: "Rendered pt-BR output",
    reset: "Reset loop",
    idle: "The collector has not inspected this call. A new source string is not part of either catalog yet.",
    skippedResult:
      "The argument depends on runtime data, so the AST collector skips it instead of inventing a catalog entry.",
    discoveredResult:
      "Build 1 collected the source and generated a null placeholder. The runtime falls back to English until an override exists.",
    missingResult:
      "The key still contains null. Add the Portuguese override, then run the next build to put it in the rendered HTML and client catalog.",
    translatedResult:
      "This build loaded the completed override. Static Astro output and hydrated Solid code now resolve the same key to Portuguese.",
    staticHint: "Resolvable during the build",
    dynamicHint: "Runtime value is intentionally outside the catalog",
    catalogComment: "generated from the source",
    catalogEmpty: "// no generated catalog entry",
    nullValue: "null",
    lesson:
      "Discovery changes generated source files; it does not hot-update the build already in progress. That is why a brand-new translation takes a discovery build, an edit, and another build.",
  },
  "pt-BR": {
    eyebrow: "Laboratório interativo",
    title: "Percorra o ciclo do catálogo com uma string",
    description:
      "Execute builds para ver quais chamadas o coletor ESTree encontra, como o hash real vira uma chave e quando o português chega à saída.",
    source: "Chamada no código",
    sourceString: "String de origem em inglês",
    staticCall: "Literal estático",
    dynamicCall: "Expressão dinâmica",
    collector: "Coletor",
    discovered: "Encontrada",
    skipped: "Ignorada",
    notRun: "Não executado",
    hash: "Hash do catálogo",
    noHash: "sem entrada",
    catalog: "Catálogo pt-BR",
    translation: "Override em português",
    translationPlaceholder: "Adicione a tradução após a descoberta",
    lockedTranslation: "Execute primeiro o build de descoberta.",
    build: "Executar build de produção",
    buildNumber: "Passagens de build",
    output: "Saída pt-BR renderizada",
    reset: "Reiniciar ciclo",
    idle: "O coletor ainda não inspecionou esta chamada. Uma string nova ainda não pertence a nenhum catálogo.",
    skippedResult:
      "O argumento depende de dados de runtime, então o coletor da AST o ignora em vez de inventar uma entrada no catálogo.",
    discoveredResult:
      "O build 1 coletou a origem e gerou um placeholder null. O runtime volta ao inglês enquanto não existir um override.",
    missingResult:
      "A chave ainda contém null. Adicione o override em português e execute o próximo build para colocá-lo no HTML e no catálogo do cliente.",
    translatedResult:
      "Este build carregou o override preenchido. A saída estática do Astro e o código Solid hidratado agora resolvem a mesma chave para o português.",
    staticHint: "Pode ser resolvido durante o build",
    dynamicHint: "O valor de runtime fica fora do catálogo de propósito",
    catalogComment: "gerado a partir da origem",
    catalogEmpty: "// nenhuma entrada gerada no catálogo",
    nullValue: "null",
    lesson:
      "A descoberta altera arquivos de código gerados; ela não atualiza o build atual em tempo real. Por isso, uma tradução inédita exige um build de descoberta, uma edição e outro build.",
  },
} as const;

const INITIAL_SOURCE = "Read the full story";

export function TranslationCatalogLab(props: TranslationCatalogLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [source, setSource] = createSignal(INITIAL_SOURCE);
  const [expression, setExpression] = createSignal<ExpressionKind>("static");
  const [translation, setTranslation] = createSignal("");
  const [catalogValue, setCatalogValue] = createSignal<string | null>();
  const [result, setResult] = createSignal<BuildResult>("idle");
  const [builds, setBuilds] = createSignal(0);

  const hash = createMemo(() => hashTranslationKey(source()));
  const collected = createMemo(() => catalogValue() !== undefined);
  const renderedOutput = createMemo(() => catalogValue() ?? source());

  function resetLoop(nextExpression = expression(), nextSource = source()) {
    setExpression(nextExpression);
    setSource(nextSource);
    setTranslation("");
    setCatalogValue(undefined);
    setResult("idle");
    setBuilds(0);
  }

  function runBuild() {
    setBuilds((current) => current + 1);

    if (expression() === "dynamic") {
      setResult("skipped");
      return;
    }

    if (catalogValue() === undefined) {
      setCatalogValue(null);
      setResult("discovered");
      return;
    }

    const nextTranslation = translation().trim();
    if (!nextTranslation) {
      setCatalogValue(null);
      setResult("missing");
      return;
    }

    setCatalogValue(nextTranslation);
    setResult("translated");
  }

  const resultText = createMemo(() => {
    switch (result()) {
      case "skipped":
        return text().skippedResult;
      case "discovered":
        return text().discoveredResult;
      case "missing":
        return text().missingResult;
      case "translated":
        return text().translatedResult;
      default:
        return text().idle;
    }
  });

  const collectorValue = createMemo(() => {
    if (result() === "idle") return text().notRun;
    return collected() ? text().discovered : text().skipped;
  });

  return (
    <ConceptLab
      id="translation-catalog-loop"
      eyebrow={text().eyebrow}
      title={text().title}
      description={text().description}
    >
      <div class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <LabCard title={text().source} accent="blue">
            <div class="space-y-3">
              <label class="block text-xs text-slate-300">
                <span>{text().sourceString}</span>
                <input
                  type="text"
                  value={source()}
                  onInput={(event) => resetLoop(expression(), event.currentTarget.value)}
                  class="mt-1.5 w-full rounded-lg border border-slate-200/15 bg-slate-950/55 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
                />
              </label>

              <div class="grid grid-cols-2 gap-2" role="group" aria-label={text().source}>
                <button
                  type="button"
                  onClick={() => resetLoop("static")}
                  aria-pressed={expression() === "static"}
                  class={`rounded-lg border px-3 py-2 text-xs transition ${
                    expression() === "static"
                      ? "border-blue-300/45 bg-blue-400/15 text-blue-100"
                      : "border-slate-200/10 bg-slate-950/35 text-slate-400"
                  }`}
                >
                  {text().staticCall}
                </button>
                <button
                  type="button"
                  onClick={() => resetLoop("dynamic")}
                  aria-pressed={expression() === "dynamic"}
                  class={`rounded-lg border px-3 py-2 text-xs transition ${
                    expression() === "dynamic"
                      ? "border-blue-300/45 bg-blue-400/15 text-blue-100"
                      : "border-slate-200/10 bg-slate-950/35 text-slate-400"
                  }`}
                >
                  {text().dynamicCall}
                </button>
              </div>

              <div class="rounded-lg border border-slate-200/10 bg-slate-950/65 p-3 font-mono text-xs leading-relaxed text-slate-300">
                <span class="text-blue-300">t</span>
                <span>(</span>
                <Show
                  when={expression() === "static"}
                  fallback={
                    <>
                      <span class="text-violet-300">prefix</span>
                      <span> + </span>
                      <span class="text-violet-300">status</span>
                    </>
                  }
                >
                  <span class="text-emerald-300">{JSON.stringify(source())}</span>
                </Show>
                <span>)</span>
                <p class="mt-1 text-xxs text-slate-500">
                  {expression() === "static" ? text().staticHint : text().dynamicHint}
                </p>
              </div>

              <button
                type="button"
                onClick={runBuild}
                class="w-full rounded-lg border border-blue-300/35 bg-blue-400/15 px-3 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-400/25"
              >
                {text().build}
              </button>
            </div>
          </LabCard>

          <LabCard title={text().catalog} accent="emerald">
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-2">
                <LabMetric label={text().collector} value={collectorValue()} />
                <LabMetric label={text().hash} value={collected() ? hash() : text().noHash} />
              </div>

              <div class="rounded-lg border border-slate-200/10 bg-slate-950/65 p-3 font-mono text-xs leading-relaxed">
                <Show
                  when={collected()}
                  fallback={<p class="text-slate-500">{text().catalogEmpty}</p>}
                >
                  <p class="text-slate-500">
                    // {source()} · {text().catalogComment}
                  </p>
                  <p class="mt-1 text-slate-300">
                    <span class="text-emerald-300">{JSON.stringify(hash())}</span>
                    <span>: </span>
                    <span class={catalogValue() ? "text-amber-200" : "text-slate-500"}>
                      {catalogValue() === null ? text().nullValue : JSON.stringify(catalogValue())}
                    </span>
                  </p>
                </Show>
              </div>

              <label class="block text-xs text-slate-300">
                <span>{text().translation}</span>
                <input
                  type="text"
                  value={translation()}
                  onInput={(event) => setTranslation(event.currentTarget.value)}
                  placeholder={text().translationPlaceholder}
                  disabled={!collected()}
                  class="mt-1.5 w-full rounded-lg border border-slate-200/15 bg-slate-950/55 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-300/50 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <Show when={!collected()}>
                  <span class="mt-1 block text-xxs text-slate-500">{text().lockedTranslation}</span>
                </Show>
              </label>
            </div>
          </LabCard>
        </div>

        <LabCard title={text().output} accent="amber">
          <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div aria-live="polite">
              <p class="font-serif text-xl text-slate-50">{renderedOutput()}</p>
              <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300/75">{resultText()}</p>
            </div>
            <div class="flex items-center gap-2 sm:flex-col sm:items-stretch">
              <LabMetric label={text().buildNumber} value={builds()} />
              <button
                type="button"
                onClick={() => resetLoop()}
                class="rounded-lg border border-slate-200/10 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-200/25 hover:text-slate-200"
              >
                {text().reset}
              </button>
            </div>
          </div>
        </LabCard>

        <p class="text-xs leading-relaxed text-slate-400">{text().lesson}</p>
      </div>
    </ConceptLab>
  );
}
