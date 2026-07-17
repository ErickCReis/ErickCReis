import { For, Show, createMemo, createSignal } from "solid-js";
import { hashTranslationKey } from "@plugins/translate-runtime";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type TranslationCatalogLabProps = { locale?: LabLocale };
type Expression = "literal" | "concatenated" | "dynamic";
type PreviewLocale = "en-US" | "pt-BR";

const source = "Nothing playing";
const expressions: Expression[] = ["literal", "concatenated", "dynamic"];
const previewLocales: PreviewLocale[] = ["en-US", "pt-BR"];

const copy = {
  "en-US": {
    label: "Interactive translation catalog workbench",
    shapes: { literal: "literal", concatenated: "static +", dynamic: "runtime value" },
    build: "run build",
    reset: "reset",
    override: "pt-BR override",
    placeholder: "Type Nada tocando",
    preview: "preview",
    pipeline: ["collect", "catalog", "bundle"],
    messages: {
      idle: "The catalog has not seen this call yet.",
      skipped: "Runtime values are skipped because the collector cannot know their key.",
      discovered: "The first build created a null entry. Edit it, then build again.",
      bundled: "The second build bundled the Portuguese override.",
      fallback: "No override was bundled, so Portuguese falls back to English.",
    },
  },
  "pt-BR": {
    label: "Bancada interativa do catálogo de traduções",
    shapes: { literal: "literal", concatenated: "soma estática", dynamic: "valor de runtime" },
    build: "rodar build",
    reset: "reiniciar",
    override: "override pt-BR",
    placeholder: "Digite Nada tocando",
    preview: "prévia",
    pipeline: ["coleta", "catálogo", "bundle"],
    messages: {
      idle: "O catálogo ainda não encontrou esta chamada.",
      skipped: "Valores de runtime são ignorados porque o coletor não conhece a chave.",
      discovered: "O primeiro build criou uma entrada null. Edite-a e rode o build novamente.",
      bundled: "O segundo build incluiu o override em português.",
      fallback: "Nenhum override foi incluído, então o português usa o inglês como fallback.",
    },
  },
} as const;

export function TranslationCatalogLab(props: TranslationCatalogLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
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

  const controlClass = (active: boolean) =>
    `rounded-full px-2.5 py-1.5 font-mono text-[9px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ${
      active ? "bg-cyan-200 text-slate-950" : "text-slate-500 hover:text-slate-200"
    }`;

  return (
    <LabFrame id="translation-catalog-loop" label={text().label} class="mx-auto max-w-xl">
      <div class="border-y border-white/10 py-4">
        <div class="flex flex-wrap items-center gap-1">
          <For each={expressions}>
            {(choice) => (
              <button
                type="button"
                onClick={() => reset(choice)}
                aria-pressed={expression() === choice}
                class={controlClass(expression() === choice)}
              >
                {text().shapes[choice]}
              </button>
            )}
          </For>
          <button
            type="button"
            onClick={() => reset()}
            class="ml-auto rounded-full px-2.5 py-1.5 font-mono text-[9px] text-slate-600 hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
          >
            {text().reset}
          </button>
        </div>

        <div class="mt-5 grid gap-4 sm:grid-cols-2 sm:divide-x sm:divide-white/10">
          <div class="min-w-0 sm:pr-4">
            <code class="block truncate font-mono text-[10px] text-emerald-200">{call()}</code>
            <p class="mt-2 font-mono text-[8px] text-slate-600">
              {expression() === "dynamic" ? "key: ?" : `key: ${hash}`}
            </p>
          </div>
          <div class="min-w-0 sm:pl-4">
            <p class="font-mono text-[9px] text-violet-200">pt-BR.ts</p>
            <code class="mt-2 block truncate font-mono text-[9px] text-slate-500">
              {expression() === "dynamic"
                ? "// no entry"
                : discovered()
                  ? `${hash}: ${draft().trim() ? JSON.stringify(draft().trim()) : "null"}`
                  : "// waiting for build"}
            </code>
          </div>
        </div>

        <div
          class="mt-4 flex items-center gap-2 font-mono text-[8px] text-slate-600"
          aria-hidden="true"
        >
          <For each={text().pipeline}>
            {(step, index) => (
              <>
                <span>{step}</span>
                <Show when={index() < 2}>
                  <span>→</span>
                </Show>
              </>
            )}
          </For>
          <span class="ml-auto">build {builds()}</span>
        </div>

        <Show when={discovered() && expression() !== "dynamic"}>
          <label class="mt-4 flex items-center gap-2 font-mono text-[9px] text-slate-500">
            <span>{text().override}</span>
            <input
              value={draft()}
              onInput={(event) => setDraft(event.currentTarget.value)}
              placeholder={text().placeholder}
              class="min-w-0 flex-1 border-b border-white/10 bg-transparent px-1 py-1 text-xs text-slate-200 outline-none focus:border-violet-200"
            />
          </label>
        </Show>

        <div class="mt-4 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={build}
            class="rounded-full bg-cyan-200 px-3 py-1.5 font-mono text-[9px] text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100"
          >
            {text().build}
          </button>
          <For each={previewLocales}>
            {(locale) => (
              <button
                type="button"
                onClick={() => setPreviewLocale(locale)}
                aria-pressed={previewLocale() === locale}
                class={controlClass(previewLocale() === locale)}
              >
                {locale}
              </button>
            )}
          </For>
        </div>

        <div class="mt-4 flex items-baseline justify-between gap-4">
          <span class="font-mono text-[8px] text-slate-600">{text().preview}</span>
          <output class="text-sm text-slate-200">{output()}</output>
        </div>
        <output class="mt-3 block text-xs text-slate-400" aria-live="polite">
          {message()}
        </output>
      </div>
    </LabFrame>
  );
}
