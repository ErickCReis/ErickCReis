import { For, Show, createMemo, createSignal } from "solid-js";
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
    override: t(locale, "pt-BR override"),
    placeholder: t(locale, "Type Nada tocando"),
    preview: t(locale, "preview"),
    skipped: t(locale, "Runtime key cannot be collected."),
  };
}

export function TranslationCatalogLab(props: TranslationCatalogLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const [expression, setExpression] = createSignal<Expression>("literal");
  const [previewLocale, setPreviewLocale] = createSignal<PreviewLocale>("pt-BR");
  const [discovered, setDiscovered] = createSignal(false);
  const [attempted, setAttempted] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  const [bundled, setBundled] = createSignal<string>();

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
    setAttempted(false);
    setDraft("");
    setBundled(undefined);
  }

  function build() {
    setAttempted(true);

    if (expression() === "dynamic") {
      setDiscovered(false);
      setBundled(undefined);
      return;
    }

    if (!discovered()) {
      setDiscovered(true);
      return;
    }

    const next = draft().trim();
    setBundled(next || undefined);
  }

  const optionClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 font-mono text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 ${
      active
        ? "bg-emerald-200 text-emerald-950"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <section
      class="not-prose mx-auto my-8 max-w-xl"
      aria-label={text().label}
      data-concept-lab="translation-catalog-loop"
    >
      <div class="overflow-hidden rounded-3xl bg-[#111827] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
        <div class="flex flex-wrap items-center gap-1 p-3 sm:p-4">
          <For each={expressions}>
            {(choice) => (
              <button
                type="button"
                onClick={() => reset(choice)}
                aria-pressed={expression() === choice}
                class={optionClass(expression() === choice)}
              >
                {text().shapes[choice]}
              </button>
            )}
          </For>
        </div>

        <div class="bg-[#09101f] px-5 py-8 sm:px-8 sm:py-10">
          <code class="block overflow-x-auto font-mono text-base font-semibold whitespace-nowrap text-white sm:text-lg">
            {call()}
          </code>

          <div class="my-6 flex items-center gap-3" aria-hidden="true">
            <span
              class={`h-2.5 w-2.5 shrink-0 rounded-full ${
                attempted() && expression() === "dynamic"
                  ? "bg-rose-400"
                  : attempted()
                    ? "bg-emerald-300"
                    : "bg-slate-700"
              }`}
            />
            <span class="h-px flex-1 bg-slate-700/80" />
            <span
              class={`font-mono text-lg font-bold ${
                !attempted()
                  ? "text-slate-700"
                  : expression() === "dynamic"
                    ? "text-rose-400"
                    : "text-emerald-300"
              }`}
            >
              {attempted() ? (expression() === "dynamic" ? "×" : "→") : "·"}
            </span>
          </div>

          <Show
            when={expression() !== "dynamic"}
            fallback={
              <p
                class={`min-h-10 font-mono text-sm font-semibold ${
                  attempted() ? "text-rose-300" : "text-slate-600"
                }`}
              >
                {attempted() ? text().skipped : "—"}
              </p>
            }
          >
            <div class="flex min-h-10 items-center gap-3 font-mono text-sm">
              <span class="shrink-0 font-semibold text-emerald-300">pt-BR</span>
              <Show when={discovered()} fallback={<span class="text-slate-600">—</span>}>
                <input
                  value={draft()}
                  onInput={(event) => setDraft(event.currentTarget.value)}
                  aria-label={text().override}
                  placeholder={text().placeholder}
                  class="min-w-0 flex-1 border-b border-emerald-300/40 bg-transparent py-1.5 font-mono text-base font-semibold text-white outline-none placeholder:text-slate-600 focus:border-emerald-200"
                />
              </Show>
            </div>
          </Show>
        </div>

        <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <button
            type="button"
            onClick={build}
            class="w-full rounded-xl bg-emerald-200 px-5 py-3 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-100 sm:w-auto"
          >
            {text().build} →
          </button>

          <div class="min-w-0 sm:text-right">
            <div class="flex items-center gap-3 sm:justify-end">
              <span class="font-mono text-xs font-semibold tracking-wider text-slate-500 uppercase">
                {text().preview}
              </span>
              <For each={previewLocales}>
                {(locale) => (
                  <button
                    type="button"
                    onClick={() => setPreviewLocale(locale)}
                    aria-pressed={previewLocale() === locale}
                    class={`font-mono text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 ${
                      previewLocale() === locale
                        ? "text-white"
                        : "text-slate-600 hover:text-slate-300"
                    }`}
                  >
                    {locale}
                  </button>
                )}
              </For>
            </div>
            <output class="mt-2 block truncate text-lg font-semibold text-emerald-200">
              {output()}
            </output>
          </div>
        </div>
      </div>
    </section>
  );
}
