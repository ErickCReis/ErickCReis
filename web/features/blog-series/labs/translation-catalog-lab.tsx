import { Show, createMemo, createSignal } from "solid-js";
import { hashTranslationKey } from "@plugins/translate-runtime";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type TranslationCatalogLabProps = { locale?: LabLocale };
type Expression = "static" | "dynamic";
type Result = "idle" | "skipped" | "discovered" | "translated";

const copy = {
  "en-US": {
    label: "Translation catalog build loop",
    modes: { static: "literal", dynamic: "runtime" },
    build: "build",
    translation: "Portuguese…",
    states: {
      idle: "not built",
      skipped: "skipped",
      discovered: "null generated",
      translated: "bundled",
    },
  },
  "pt-BR": {
    label: "Ciclo de build do catálogo de traduções",
    modes: { static: "literal", dynamic: "runtime" },
    build: "build",
    translation: "Português…",
    states: {
      idle: "não compilado",
      skipped: "ignorado",
      discovered: "null gerado",
      translated: "incluído",
    },
  },
} as const;

export function TranslationCatalogLab(props: TranslationCatalogLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [source, setSource] = createSignal("Read the full story");
  const [expression, setExpression] = createSignal<Expression>("static");
  const [catalog, setCatalog] = createSignal<string | null>();
  const [translation, setTranslation] = createSignal("");
  const [result, setResult] = createSignal<Result>("idle");
  const [builds, setBuilds] = createSignal(0);
  const hash = createMemo(() => hashTranslationKey(source()));
  const output = createMemo(() => catalog() ?? source());

  function reset(nextSource = source(), nextExpression = expression()) {
    setSource(nextSource);
    setExpression(nextExpression);
    setCatalog(undefined);
    setTranslation("");
    setResult("idle");
    setBuilds(0);
  }

  function build() {
    setBuilds((value) => value + 1);
    if (expression() === "dynamic") {
      setCatalog(undefined);
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
      <div class="rounded-2xl border border-sky-200/15 bg-[#07111b] p-3 shadow-xl shadow-sky-950/20">
        <div class="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
          <div class="overflow-hidden rounded-lg border border-slate-200/10 bg-slate-950/65">
            <div class="flex items-center justify-between border-b border-slate-200/10 px-2.5 py-1.5 font-mono text-[9px] text-slate-600">
              <span>App.tsx</span>
              <button
                type="button"
                onClick={() => reset(source(), expression() === "static" ? "dynamic" : "static")}
                class="text-sky-200/60"
              >
                {text().modes[expression()]}
              </button>
            </div>
            <div class="p-3 font-mono text-[10px] text-slate-400">
              <span class="text-sky-300">t</span>(
              <Show
                when={expression() === "static"}
                fallback={<span class="text-violet-300">prefix + status</span>}
              >
                <span class="text-emerald-300">{JSON.stringify(source())}</span>
              </Show>
              )
              <input
                value={source()}
                onInput={(event) => reset(event.currentTarget.value, expression())}
                aria-label={text().label}
                class="mt-3 block w-full border-b border-slate-700 bg-transparent pb-1 text-[10px] text-slate-300 outline-none focus:border-sky-300"
              />
            </div>
          </div>

          <div class="flex flex-row items-center justify-center gap-2 sm:flex-col">
            <span class="font-mono text-[9px] text-slate-700">→</span>
            <button
              type="button"
              onClick={build}
              class="rounded-full bg-sky-300 px-3 py-2 font-mono text-[9px] font-semibold text-slate-950"
            >
              {text().build} {builds() + 1}
            </button>
            <span class="font-mono text-[9px] text-slate-700">→</span>
          </div>

          <div class="overflow-hidden rounded-lg border border-slate-200/10 bg-slate-950/65">
            <div class="border-b border-slate-200/10 px-2.5 py-1.5 font-mono text-[9px] text-slate-600">
              pt-BR.ts
            </div>
            <div class="p-3 font-mono text-[10px]">
              <Show
                when={catalog() !== undefined}
                fallback={<span class="text-slate-700">// ∅</span>}
              >
                <p class="truncate text-slate-600">// {source()}</p>
                <p class="mt-1 text-slate-300">
                  <span class="text-sky-300">{JSON.stringify(hash())}</span>:{" "}
                  {catalog() === null ? (
                    <span class="text-amber-300">null</span>
                  ) : (
                    <span class="text-emerald-300">{JSON.stringify(catalog())}</span>
                  )}
                </p>
              </Show>
              <input
                value={translation()}
                onInput={(event) => setTranslation(event.currentTarget.value)}
                placeholder={text().translation}
                disabled={catalog() === undefined}
                class="mt-3 block w-full border-b border-slate-700 bg-transparent pb-1 text-[10px] text-slate-300 outline-none placeholder:text-slate-700 focus:border-emerald-300 disabled:opacity-25"
              />
            </div>
          </div>
        </div>

        <div class="mt-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-slate-950">
          <span class="size-2 rounded-full bg-emerald-500" />
          <output class="min-w-0 flex-1 truncate font-serif text-sm" aria-live="polite">
            {output()}
          </output>
          <span class="font-mono text-[9px] text-slate-400">{text().states[result()]}</span>
        </div>
      </div>
    </LabFrame>
  );
}
