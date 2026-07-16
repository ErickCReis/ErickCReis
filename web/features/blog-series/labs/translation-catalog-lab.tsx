import { For, Show, createMemo, createSignal } from "solid-js";
import { hashTranslationKey } from "@plugins/translate-runtime";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type TranslationCatalogLabProps = { locale?: LabLocale };
type Expression = "literal" | "concatenated" | "dynamic";
type PreviewLocale = "en-US" | "pt-BR";
type Result = "idle" | "skipped" | "discovered" | "draft" | "translated";

const examples = [
  { source: "Nothing playing", translation: "Nada tocando" },
  { source: "Now Playing", translation: "Tocando agora" },
  { source: "Content", translation: "Conteúdo" },
] as const;

const expressions: Expression[] = ["literal", "concatenated", "dynamic"];
const previewLocales: PreviewLocale[] = ["en-US", "pt-BR"];

const copy = {
  "en-US": {
    label: "Interactive translation catalog workbench",
    eyebrow: "Catalog workbench",
    title: "Take one UI string through two builds",
    intro:
      "Change the call shape, run the collector, then edit its artifact. The preview only receives what the latest build bundled.",
    reset: "Reset workbench",
    callShape: "Call shape",
    shapes: {
      literal: { label: "literal", detail: "collected" },
      concatenated: { label: "static +", detail: "resolved" },
      dynamic: { label: "runtime value", detail: "skipped" },
    },
    sourceFile: "collector input",
    sourceLabel: "English source string",
    examples: "Try an existing UI string",
    hash: "FNV hash",
    targetFile: "generated artifact",
    translationLabel: "pt-BR override",
    translationPlaceholder: "Type the translation…",
    useSuggestion: "Use suggestion",
    catalogWaiting: "Run a build to create the catalog entry.",
    catalogSkipped: "Runtime data cannot become a static catalog key.",
    runBuild: "Run build",
    build: "build",
    messages: {
      idle: "A production build starts the collector.",
      skipped: "No key is guessed for a value known only at runtime.",
      discovered: "The key now exists as null. Add Portuguese, then build again.",
      draft: "The generated file has an edit that the next build can bundle.",
      translated: "The completed override is now in the client bundle.",
    },
    pipeline: "Build pipeline",
    steps: {
      collect: "collect",
      catalog: "catalog",
      bundle: "client",
    },
    statuses: {
      waiting: "waiting",
      found: "static value found",
      skipped: "no entry",
      placeholder: "null placeholder",
      draft: "draft edited",
      saved: "override saved",
      fallback: "source fallback",
      previous: "previous bundle",
      bundled: "override bundled",
    },
    preview: "Rendered component",
    previewLocale: "Preview locale",
    origin: "value source",
    origins: {
      default: "default source",
      fallback: "English fallback",
      previous: "previous bundle",
      override: "pt-BR override",
    },
  },
  "pt-BR": {
    label: "Bancada interativa do catálogo de traduções",
    eyebrow: "Bancada do catálogo",
    title: "Leve uma string por dois builds",
    intro:
      "Mude a forma da chamada, rode o coletor e edite o artefato. A prévia só recebe o que o último build empacotou.",
    reset: "Reiniciar bancada",
    callShape: "Forma da chamada",
    shapes: {
      literal: { label: "literal", detail: "coletada" },
      concatenated: { label: "soma estática", detail: "resolvida" },
      dynamic: { label: "valor de runtime", detail: "ignorado" },
    },
    sourceFile: "entrada do coletor",
    sourceLabel: "String de origem em inglês",
    examples: "Teste uma string existente da interface",
    hash: "hash FNV",
    targetFile: "artefato gerado",
    translationLabel: "Override em pt-BR",
    translationPlaceholder: "Digite a tradução…",
    useSuggestion: "Usar sugestão",
    catalogWaiting: "Rode um build para criar a entrada no catálogo.",
    catalogSkipped: "Dados de runtime não podem virar uma chave estática.",
    runBuild: "Rodar build",
    build: "build",
    messages: {
      idle: "Um build de produção inicia o coletor.",
      skipped: "Nenhuma chave é inventada para um valor conhecido só em runtime.",
      discovered: "A chave agora existe como null. Adicione o português e rode outro build.",
      draft: "O arquivo gerado tem uma edição que o próximo build pode empacotar.",
      translated: "O override completo agora está no bundle do cliente.",
    },
    pipeline: "Pipeline do build",
    steps: {
      collect: "coleta",
      catalog: "catálogo",
      bundle: "cliente",
    },
    statuses: {
      waiting: "aguardando",
      found: "valor estático encontrado",
      skipped: "sem entrada",
      placeholder: "placeholder null",
      draft: "rascunho editado",
      saved: "override salvo",
      fallback: "fallback para a origem",
      previous: "bundle anterior",
      bundled: "override empacotado",
    },
    preview: "Componente renderizado",
    previewLocale: "Idioma da prévia",
    origin: "origem do valor",
    origins: {
      default: "texto padrão",
      fallback: "fallback em inglês",
      previous: "bundle anterior",
      override: "override pt-BR",
    },
  },
} as const;

export function TranslationCatalogLab(props: TranslationCatalogLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [source, setSource] = createSignal<string>(examples[0].source);
  const [expression, setExpression] = createSignal<Expression>("literal");
  const [catalog, setCatalog] = createSignal<string | null>();
  const [translation, setTranslation] = createSignal("");
  const [result, setResult] = createSignal<Result>("idle");
  const [builds, setBuilds] = createSignal(0);
  const [previewLocale, setPreviewLocale] = createSignal<PreviewLocale>("pt-BR");

  const hash = createMemo(() => hashTranslationKey(source()));
  const currentExample = createMemo(() => examples.find((example) => example.source === source()));
  const sourceChunks = createMemo(() => {
    const midpoint = Math.max(1, Math.ceil(source().length / 2));
    return [source().slice(0, midpoint), source().slice(midpoint)] as const;
  });
  const output = createMemo(() => {
    if (previewLocale() === "en-US") return source();
    return typeof catalog() === "string" ? catalog() : source();
  });
  const outputOrigin = createMemo(() => {
    if (previewLocale() === "en-US") return text().origins.default;
    if (typeof catalog() !== "string") return text().origins.fallback;
    return result() === "draft" ? text().origins.previous : text().origins.override;
  });
  const catalogStatus = createMemo(() => {
    if (result() === "idle") return text().statuses.waiting;
    if (result() === "skipped") return text().statuses.skipped;
    if (result() === "discovered") return text().statuses.placeholder;
    if (result() === "draft") return text().statuses.draft;
    return text().statuses.saved;
  });
  const bundleStatus = createMemo(() => {
    if (result() === "idle") return text().statuses.waiting;
    if (result() === "translated") return text().statuses.bundled;
    if (result() === "draft" && typeof catalog() === "string") {
      return text().statuses.previous;
    }
    return text().statuses.fallback;
  });

  function reset(
    nextSource: string = examples[0].source,
    nextExpression: Expression = expression(),
  ) {
    setSource(nextSource);
    setExpression(nextExpression);
    setCatalog(undefined);
    setTranslation("");
    setResult("idle");
    setBuilds(0);
  }

  function editTranslation(value: string) {
    setTranslation(value);
    const saved = catalog();
    if (saved === undefined) return;

    const next = value.trim();
    if (next === (saved ?? "")) {
      setResult(typeof saved === "string" ? "translated" : "discovered");
      return;
    }
    setResult("draft");
  }

  function build() {
    setBuilds((value) => value + 1);

    if (expression() === "dynamic") {
      setCatalog(undefined);
      setTranslation("");
      setResult("skipped");
      return;
    }

    if (catalog() === undefined) {
      setCatalog(null);
      setResult("discovered");
      return;
    }

    const next = translation().trim();
    setCatalog(next || null);
    setResult(next ? "translated" : "discovered");
  }

  return (
    <LabFrame id="translation-catalog-loop" label={text().label} class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-[1.75rem] border border-cyan-200/15 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.1),transparent_35%),radial-gradient(circle_at_92%_100%,rgba(167,139,250,0.09),transparent_38%),#060a11] shadow-2xl shadow-slate-950/40">
        <header class="flex items-start gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <div class="min-w-0 flex-1">
            <p class="font-mono text-[9px] tracking-[0.2em] text-cyan-200/55 uppercase">
              {text().eyebrow}
            </p>
            <h3 class="mt-1 text-base font-medium tracking-tight text-slate-100">{text().title}</h3>
            <p id="translation-workbench-intro" class="mt-1.5 max-w-xl text-xs text-slate-400">
              {text().intro}
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            aria-label={text().reset}
            title={text().reset}
            class="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] font-mono text-sm text-slate-500 transition-colors hover:border-white/20 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-reduce:transition-none"
          >
            ↺
          </button>
        </header>

        <fieldset class="border-b border-white/[0.07] p-3 sm:px-4">
          <legend class="sr-only">{text().callShape}</legend>
          <div
            class="grid grid-cols-3 gap-1 rounded-xl bg-slate-950/65 p-1"
            aria-describedby="translation-workbench-intro"
          >
            <For each={expressions}>
              {(choice) => (
                <button
                  type="button"
                  onClick={() => reset(source(), choice)}
                  aria-pressed={expression() === choice}
                  class={`min-w-0 rounded-lg border px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-reduce:transition-none ${
                    expression() === choice
                      ? choice === "dynamic"
                        ? "border-amber-200/30 bg-amber-300/10 text-amber-100"
                        : "border-cyan-200/30 bg-cyan-300/10 text-cyan-100"
                      : "border-transparent text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                  }`}
                >
                  <span class="block truncate font-mono text-[9px] font-semibold uppercase">
                    {text().shapes[choice].label}
                  </span>
                  <span class="mt-0.5 block truncate text-[9px] opacity-55">
                    {text().shapes[choice].detail}
                  </span>
                </button>
              )}
            </For>
          </div>
        </fieldset>

        <div class="grid gap-px bg-white/[0.07] sm:grid-cols-2">
          <section class="min-w-0 bg-[#070b12] p-4" aria-labelledby="translation-source-heading">
            <div class="flex items-center justify-between gap-3 font-mono text-[9px]">
              <h4 id="translation-source-heading" class="text-slate-500">
                App.tsx
              </h4>
              <span class="text-cyan-200/50">{text().sourceFile}</span>
            </div>

            <div class="mt-3 min-h-14 overflow-x-auto rounded-lg border border-white/[0.06] bg-slate-950/65 p-3 font-mono text-[10px] leading-5 whitespace-nowrap text-slate-400">
              <span class="text-cyan-300">t</span>(
              <Show when={expression() === "literal"}>
                <span class="text-emerald-300">{JSON.stringify(source())}</span>
              </Show>
              <Show when={expression() === "concatenated"}>
                <span class="text-emerald-300">{JSON.stringify(sourceChunks()[0])}</span>
                <span class="text-slate-600"> + </span>
                <span class="text-emerald-300">{JSON.stringify(sourceChunks()[1])}</span>
              </Show>
              <Show when={expression() === "dynamic"}>
                <span class="text-violet-300">statusLabel</span>
              </Show>
              )
            </div>

            <label
              for="translation-source-input"
              class="mt-3 block font-mono text-[9px] text-slate-500"
            >
              {text().sourceLabel}
            </label>
            <input
              id="translation-source-input"
              value={source()}
              onInput={(event) => reset(event.currentTarget.value, expression())}
              spellcheck={false}
              class="mt-1 block w-full rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-slate-200 outline-none transition-colors focus:border-cyan-200/45 motion-reduce:transition-none"
            />

            <p class="mt-3 font-mono text-[8px] tracking-[0.12em] text-slate-600 uppercase">
              {text().examples}
            </p>
            <div class="mt-1.5 flex flex-wrap gap-1">
              <For each={examples}>
                {(example) => (
                  <button
                    type="button"
                    onClick={() => reset(example.source, expression())}
                    aria-pressed={source() === example.source}
                    class={`rounded-full border px-2 py-1 font-mono text-[8px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-reduce:transition-none ${
                      source() === example.source
                        ? "border-cyan-200/25 bg-cyan-300/8 text-cyan-100"
                        : "border-white/[0.07] text-slate-600 hover:text-slate-300"
                    }`}
                  >
                    {example.source}
                  </button>
                )}
              </For>
            </div>
          </section>

          <section class="min-w-0 bg-[#070b12] p-4" aria-labelledby="translation-catalog-heading">
            <div class="flex items-center justify-between gap-3 font-mono text-[9px]">
              <h4 id="translation-catalog-heading" class="text-slate-500">
                pt-BR.ts
              </h4>
              <span class="text-violet-200/50">{text().targetFile}</span>
            </div>

            <div class="mt-3 min-h-14 overflow-x-auto rounded-lg border border-white/[0.06] bg-slate-950/65 p-3 font-mono text-[10px] leading-5 whitespace-nowrap">
              <Show
                when={catalog() !== undefined}
                fallback={
                  <span class={result() === "skipped" ? "text-amber-200/60" : "text-slate-700"}>
                    // {result() === "skipped" ? text().catalogSkipped : text().catalogWaiting}
                  </span>
                }
              >
                <p class="text-slate-600">// {source()}</p>
                <p>
                  <span class="text-cyan-300">{JSON.stringify(hash())}</span>
                  <span class="text-slate-600">: </span>
                  <Show
                    when={translation().trim()}
                    fallback={<span class="text-amber-300">null</span>}
                  >
                    <span class="text-emerald-300">{JSON.stringify(translation().trim())}</span>
                  </Show>
                </p>
              </Show>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3">
              <label for="translation-override-input" class="font-mono text-[9px] text-slate-500">
                {text().translationLabel}
              </label>
              <span class="font-mono text-[8px] text-slate-700">
                {expression() === "dynamic" ? "—" : `${text().hash} · ${hash()}`}
              </span>
            </div>
            <input
              id="translation-override-input"
              value={translation()}
              onInput={(event) => editTranslation(event.currentTarget.value)}
              placeholder={text().translationPlaceholder}
              disabled={catalog() === undefined}
              aria-describedby="translation-build-message"
              class="mt-1 block w-full rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-slate-200 outline-none transition-colors placeholder:text-slate-700 focus:border-emerald-200/45 disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none"
            />

            <Show when={catalog() !== undefined && currentExample()}>
              <button
                type="button"
                onClick={() => editTranslation(currentExample()!.translation)}
                class="mt-2 rounded-full border border-emerald-200/15 bg-emerald-300/[0.04] px-2.5 py-1 font-mono text-[8px] text-emerald-100/65 transition-colors hover:border-emerald-200/30 hover:text-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 motion-reduce:transition-none"
              >
                {text().useSuggestion} → {currentExample()!.translation}
              </button>
            </Show>
          </section>
        </div>

        <div class="border-t border-white/[0.07] p-3 sm:p-4">
          <div class="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={build}
              class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-cyan-200 px-4 font-mono text-[10px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.13)] transition-colors hover:bg-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100 motion-reduce:transition-none"
            >
              <span aria-hidden="true">▶</span>
              {text().runBuild}
              <span class="opacity-55">{builds() + 1}</span>
            </button>
            <div class="min-w-0">
              <p class="font-mono text-[8px] tracking-[0.14em] text-slate-600 uppercase">
                {text().build} {builds() || "—"}
              </p>
              <p
                id="translation-build-message"
                class="mt-0.5 text-[11px] leading-relaxed text-slate-300"
                aria-live="polite"
              >
                {text().messages[result()]}
              </p>
            </div>
          </div>

          <div class="mt-3">
            <p class="font-mono text-[8px] tracking-[0.16em] text-slate-600 uppercase">
              {text().pipeline}
            </p>
            <ol class="mt-1.5 grid gap-1.5 sm:grid-cols-3">
              <li
                class={`rounded-xl border px-3 py-2.5 transition-colors motion-reduce:transition-none ${
                  result() === "idle"
                    ? "border-white/[0.07] bg-white/[0.02]"
                    : result() === "skipped"
                      ? "border-amber-200/20 bg-amber-300/[0.05]"
                      : "border-cyan-200/20 bg-cyan-300/[0.05]"
                }`}
              >
                <div class="flex items-center gap-2">
                  <span
                    class={`size-1.5 rounded-full ${
                      result() === "idle"
                        ? "bg-slate-700"
                        : result() === "skipped"
                          ? "bg-amber-300"
                          : "bg-cyan-300"
                    }`}
                  />
                  <span class="font-mono text-[9px] text-slate-400">
                    01 · {text().steps.collect}
                  </span>
                </div>
                <p class="mt-1 truncate text-[9px] text-slate-600">
                  {result() === "idle"
                    ? text().statuses.waiting
                    : result() === "skipped"
                      ? text().statuses.skipped
                      : text().statuses.found}
                </p>
              </li>

              <li
                class={`rounded-xl border px-3 py-2.5 transition-colors motion-reduce:transition-none ${
                  result() === "discovered"
                    ? "border-amber-200/20 bg-amber-300/[0.05]"
                    : result() === "draft"
                      ? "border-violet-200/20 bg-violet-300/[0.05]"
                      : result() === "translated"
                        ? "border-emerald-200/20 bg-emerald-300/[0.05]"
                        : "border-white/[0.07] bg-white/[0.02]"
                }`}
              >
                <div class="flex items-center gap-2">
                  <span
                    class={`size-1.5 rounded-full ${
                      result() === "discovered"
                        ? "bg-amber-300"
                        : result() === "draft"
                          ? "bg-violet-300"
                          : result() === "translated"
                            ? "bg-emerald-300"
                            : "bg-slate-700"
                    }`}
                  />
                  <span class="font-mono text-[9px] text-slate-400">
                    02 · {text().steps.catalog}
                  </span>
                </div>
                <p class="mt-1 truncate text-[9px] text-slate-600">{catalogStatus()}</p>
              </li>

              <li
                class={`rounded-xl border px-3 py-2.5 transition-colors motion-reduce:transition-none ${
                  result() === "translated"
                    ? "border-emerald-200/20 bg-emerald-300/[0.05]"
                    : result() === "draft"
                      ? "border-violet-200/20 bg-violet-300/[0.05]"
                      : "border-white/[0.07] bg-white/[0.02]"
                }`}
              >
                <div class="flex items-center gap-2">
                  <span
                    class={`size-1.5 rounded-full ${
                      result() === "translated"
                        ? "bg-emerald-300"
                        : result() === "draft"
                          ? "bg-violet-300"
                          : "bg-slate-700"
                    }`}
                  />
                  <span class="font-mono text-[9px] text-slate-400">
                    03 · {text().steps.bundle}
                  </span>
                </div>
                <p class="mt-1 truncate text-[9px] text-slate-600">{bundleStatus()}</p>
              </li>
            </ol>
          </div>

          <section
            class="mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-100 text-slate-950"
            aria-labelledby="translation-preview-heading"
          >
            <div class="flex flex-wrap items-center gap-2 border-b border-slate-950/10 px-3 py-2">
              <h4
                id="translation-preview-heading"
                class="mr-auto font-mono text-[8px] tracking-[0.12em] text-slate-500 uppercase"
              >
                {text().preview}
              </h4>
              <span class="sr-only">{text().previewLocale}</span>
              <div
                class="flex rounded-full bg-slate-950/5 p-0.5"
                role="group"
                aria-label={text().previewLocale}
              >
                <For each={previewLocales}>
                  {(locale) => (
                    <button
                      type="button"
                      onClick={() => setPreviewLocale(locale)}
                      aria-pressed={previewLocale() === locale}
                      class={`rounded-full px-2 py-1 font-mono text-[8px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-950 motion-reduce:transition-none ${
                        previewLocale() === locale
                          ? "bg-slate-950 text-white"
                          : "text-slate-500 hover:text-slate-950"
                      }`}
                    >
                      {locale}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <div class="flex min-h-16 items-center gap-3 px-3 py-3">
              <span
                class="grid size-8 shrink-0 place-items-center rounded-full bg-slate-950 font-mono text-[9px] text-cyan-200"
                aria-hidden="true"
              >
                t()
              </span>
              <output class="min-w-0 flex-1 truncate font-serif text-base" aria-live="polite">
                {output()}
              </output>
              <span class="hidden text-right font-mono text-[8px] text-slate-400 min-[390px]:block">
                <span class="block uppercase">{text().origin}</span>
                <span class="mt-0.5 block text-slate-600">{outputOrigin()}</span>
              </span>
            </div>
          </section>
        </div>
      </div>
    </LabFrame>
  );
}
