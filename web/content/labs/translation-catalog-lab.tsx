import { For, Show, createMemo, createSignal } from "solid-js";
import { hashTranslationKey } from "@plugins/translate-runtime";
import { resolveLocale, t, type Locale } from "virtual:translate";

type TranslationCatalogLabProps = { locale?: Locale };
type Expression = "literal" | "concatenated" | "dynamic";
type PreviewLocale = "en-US" | "pt-BR";

const source = "Nothing playing";
const expressions: Expression[] = ["literal", "concatenated", "dynamic"];
const previewLocales: PreviewLocale[] = ["en-US", "pt-BR"];
function getCopy(locale: Locale) {
  return {
    label: t(locale, "Interactive translation catalog workbench"),
    shapes: {
      literal: t(locale, "literal"),
      concatenated: t(locale, "static +"),
      dynamic: t(locale, "runtime value"),
    },
    build: t(locale, "run build"),
    reset: t(locale, "reset"),
    override: t(locale, "pt-BR override"),
    placeholder: t(locale, "Type Nada tocando"),
    preview: t(locale, "preview"),
    collect: t(locale, "collect"),
    catalog: t(locale, "catalog"),
    bundle: t(locale, "bundle"),
    messages: {
      idle: t(locale, "The catalog has not seen this call yet."),
      skipped: t(locale, "Runtime values are skipped because the collector cannot know their key."),
      discovered: t(locale, "The first build created a null entry. Edit it, then build again."),
      bundled: t(locale, "The second build bundled the Portuguese override."),
      fallback: t(locale, "No override was bundled, so Portuguese falls back to English."),
    },
  };
}

export function TranslationCatalogLab(props: TranslationCatalogLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const [expression, setExpression] = createSignal<Expression>("literal");
  const [previewLocale, setPreviewLocale] = createSignal<PreviewLocale>("pt-BR");
  const [discovered, setDiscovered] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  const [bundled, setBundled] = createSignal<string>();
  const [message, setMessage] = createSignal<string>(text().messages.idle);
  const [builds, setBuilds] = createSignal(0);

  const hash = hashTranslationKey(source);
  const call = createMemo(() => {
    if (expression() === "literal") return `t(${JSON.stringify(source)})`;
    if (expression() === "concatenated") return 't("Nothing " + "playing")';
    return "t(statusLabel)";
  });
  const output = createMemo(() => {
    if (previewLocale() === "en-US") return source;
    return bundled() || source;
  });

  function reset(nextExpression = expression()) {
    setExpression(nextExpression);
    setDiscovered(false);
    setDraft("");
    setBundled(undefined);
    setBuilds(0);
    setMessage(text().messages.idle);
  }

  function build() {
    setBuilds((value) => value + 1);
    if (expression() === "dynamic") {
      setDiscovered(false);
      setBundled(undefined);
      setMessage(text().messages.skipped);
      return;
    }
    if (!discovered()) {
      setDiscovered(true);
      setMessage(text().messages.discovered);
      return;
    }
    const next = draft().trim();
    setBundled(next || undefined);
    setMessage(next ? text().messages.bundled : text().messages.fallback);
  }

  const tabClass = (active: boolean) =>
    `border-b px-0.5 pb-1 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 ${
      active
        ? "border-cyan-200 text-cyan-100"
        : "border-transparent text-slate-600 hover:text-slate-300"
    }`;

  return (
    <section
      class="not-prose my-8 mx-auto max-w-xl"
      aria-label={text().label}
      data-concept-lab="translation-catalog-loop"
    >
      <div class="relative border-l border-white/10 pl-5 sm:pl-7">
        <div class="flex flex-wrap items-end gap-x-4 gap-y-2">
          <For each={expressions}>
            {(choice) => (
              <button
                type="button"
                onClick={() => reset(choice)}
                aria-pressed={expression() === choice}
                class={tabClass(expression() === choice)}
              >
                {text().shapes[choice]}
              </button>
            )}
          </For>
          <button
            type="button"
            onClick={() => reset()}
            class="ml-auto font-mono text-xs text-slate-700 transition-colors hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-300"
          >
            {text().reset}
          </button>
        </div>

        <div class="relative mt-8">
          <span class="absolute -left-[1.85rem] top-1.5 size-2 rounded-full bg-emerald-200 ring-4 ring-slate-950 sm:-left-[2.35rem]" />
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
                01 · {text().collect}
              </p>
              <code class="mt-2 block truncate font-mono text-sm text-emerald-100">{call()}</code>
            </div>
            <code class="mt-5 shrink-0 font-mono text-xs text-slate-600">
              {expression() === "dynamic" ? "key / unknown" : hash}
            </code>
          </div>
        </div>

        <div class="relative mt-8">
          <span
            class={`absolute -left-[1.85rem] top-1.5 size-2 rounded-full ring-4 ring-slate-950 sm:-left-[2.35rem] ${
              discovered() ? "bg-violet-200" : "bg-slate-800"
            }`}
          />
          <p class="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
            02 · {text().catalog} / pt-BR.ts
          </p>
          <div class="mt-2 flex min-h-7 min-w-0 items-center gap-2 border-b border-white/10 pb-2">
            <code class="min-w-0 truncate font-mono text-xs text-violet-100">
              {expression() === "dynamic"
                ? "// no entry"
                : discovered()
                  ? `${hash}:`
                  : "// waiting for build"}
            </code>
            <Show when={discovered() && expression() !== "dynamic"}>
              <input
                value={draft()}
                onInput={(event) => setDraft(event.currentTarget.value)}
                aria-label={text().override}
                placeholder={text().placeholder}
                class="min-w-0 flex-1 bg-transparent font-mono text-xs text-slate-200 outline-none placeholder:text-slate-700"
              />
            </Show>
          </div>
        </div>

        <div class="my-6 flex items-center gap-3">
          <button
            type="button"
            onClick={build}
            class="font-mono text-xs text-cyan-100 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-100"
          >
            {text().build} →
          </button>
          <span class="h-px flex-1 bg-white/10" aria-hidden="true" />
          <span class="font-mono text-xs text-slate-700">#{builds()}</span>
        </div>

        <div class="relative">
          <span
            class={`absolute -left-[1.85rem] top-1.5 size-2 rounded-full ring-4 ring-slate-950 sm:-left-[2.35rem] ${
              bundled() ? "bg-cyan-200" : "bg-slate-800"
            }`}
          />
          <div class="flex flex-wrap items-start justify-between gap-3">
            <p class="font-mono text-xs uppercase tracking-[0.2em] text-slate-700">
              03 · {text().bundle}
            </p>
            <div class="flex gap-3">
              <For each={previewLocales}>
                {(locale) => (
                  <button
                    type="button"
                    onClick={() => setPreviewLocale(locale)}
                    aria-pressed={previewLocale() === locale}
                    class={tabClass(previewLocale() === locale)}
                  >
                    {locale}
                  </button>
                )}
              </For>
            </div>
          </div>
          <div class="mt-4 flex items-baseline justify-between gap-4">
            <span class="font-mono text-xs text-slate-700">{text().preview}</span>
            <output class="text-base text-slate-100">{output()}</output>
          </div>
        </div>

        <output
          class="mt-7 block max-w-md text-sm leading-relaxed text-slate-500"
          aria-live="polite"
        >
          {message()}
        </output>
      </div>
    </section>
  );
}
