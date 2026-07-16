import { createMemo, createSignal, For } from "solid-js";
import { ConceptLab, LabCard, LabMetric } from "@web/features/blog-series/components/concept-lab";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type BoundaryMode = "overlay" | "full-app";

type IslandBoundaryLabProps = {
  locale?: LabLocale;
};

const copy = {
  "en-US": {
    eyebrow: "Interactive concept lab",
    title: "Test the island boundary",
    description:
      "Change who owns the document, then introduce browser and network failures. A useful island boundary limits what each failure can remove.",
    modes: {
      overlay: "Astro document + Solid overlay",
      "full-app": "Solid owns the whole page",
    },
    failures: "Failure switches",
    javascript: "JavaScript starts",
    connection: "Live connection works",
    surfaces: "Page surfaces",
    document: "Generated document",
    documentItems: ["Heading and description", "Project links", "Navigation and metadata"],
    live: "Live overlay",
    liveItems: ["Telemetry panels", "Remote cursors"],
    available: "available",
    unavailable: "unavailable",
    staticMetric: "Document content",
    liveMetric: "Live features",
    takeaway: {
      overlay:
        "Astro owns the content, so a JavaScript or stream failure removes only behavior that needs the browser.",
      "full-app":
        "When the client tree owns the document, a JavaScript failure also removes content that never needed client state.",
    },
  },
  "pt-BR": {
    eyebrow: "Laboratório interativo",
    title: "Teste a fronteira da ilha",
    description:
      "Mude quem controla o documento e introduza falhas no navegador e na rede. Uma boa fronteira limita o que cada falha consegue remover.",
    modes: {
      overlay: "Documento do Astro + camada do Solid",
      "full-app": "Solid controla a página inteira",
    },
    failures: "Controles de falha",
    javascript: "JavaScript inicia",
    connection: "Conexão dinâmica funciona",
    surfaces: "Superfícies da página",
    document: "Documento gerado",
    documentItems: ["Título e descrição", "Links dos projetos", "Navegação e metadados"],
    live: "Camada interativa",
    liveItems: ["Painéis de telemetria", "Cursores remotos"],
    available: "disponível",
    unavailable: "indisponível",
    staticMetric: "Conteúdo do documento",
    liveMetric: "Funcionalidades dinâmicas",
    takeaway: {
      overlay:
        "O Astro controla o conteúdo, então uma falha no JavaScript ou no fluxo remove apenas o comportamento que precisa do navegador.",
      "full-app":
        "Quando a árvore do cliente controla o documento, uma falha no JavaScript também remove conteúdo que nunca precisou de estado no cliente.",
    },
  },
} as const;

export function IslandBoundaryLab(props: IslandBoundaryLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [mode, setMode] = createSignal<BoundaryMode>("overlay");
  const [javascriptStarts, setJavascriptStarts] = createSignal(true);
  const [connectionWorks, setConnectionWorks] = createSignal(true);

  const documentAvailable = createMemo(() => mode() === "overlay" || javascriptStarts());
  const liveAvailable = createMemo(() => javascriptStarts() && connectionWorks());
  const documentAvailableCount = createMemo(() =>
    documentAvailable() ? text().documentItems.length : 0,
  );
  const liveAvailableCount = createMemo(() => (liveAvailable() ? text().liveItems.length : 0));

  return (
    <ConceptLab
      id="island-boundary"
      eyebrow={text().eyebrow}
      title={text().title}
      description={text().description}
    >
      <div class="space-y-4">
        <div class="grid gap-2 sm:grid-cols-2" role="group" aria-label={text().title}>
          {(["overlay", "full-app"] as const).map((item) => (
            <button
              type="button"
              onClick={() => setMode(item)}
              aria-pressed={mode() === item}
              class={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                mode() === item
                  ? "border-blue-300/45 bg-blue-300/10 text-blue-50"
                  : "border-slate-200/10 bg-slate-900/30 text-slate-300 hover:border-slate-200/25"
              }`}
            >
              {text().modes[item]}
            </button>
          ))}
        </div>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <LabCard title={text().failures} accent="slate">
            <div class="space-y-2">
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200">
                <span>{text().javascript}</span>
                <input
                  type="checkbox"
                  checked={javascriptStarts()}
                  onChange={(event) => setJavascriptStarts(event.currentTarget.checked)}
                  class="size-4 accent-blue-400"
                />
              </label>
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200">
                <span>{text().connection}</span>
                <input
                  type="checkbox"
                  checked={connectionWorks()}
                  onChange={(event) => setConnectionWorks(event.currentTarget.checked)}
                  class="size-4 accent-blue-400"
                />
              </label>

              <dl class="grid grid-cols-2 gap-2 pt-2">
                <LabMetric
                  label={text().staticMetric}
                  value={`${documentAvailableCount()}/${text().documentItems.length}`}
                />
                <LabMetric
                  label={text().liveMetric}
                  value={`${liveAvailableCount()}/${text().liveItems.length}`}
                />
              </dl>
            </div>
          </LabCard>

          <LabCard title={text().surfaces} accent="blue">
            <div class="grid gap-3 sm:grid-cols-2" aria-live="polite">
              <section
                class={`rounded-lg border p-3 transition ${
                  documentAvailable()
                    ? "border-emerald-300/25 bg-emerald-300/5"
                    : "border-rose-300/20 bg-rose-300/5 opacity-55"
                }`}
              >
                <div class="flex items-center justify-between gap-2">
                  <h4 class="font-mono text-xs text-slate-100 uppercase">{text().document}</h4>
                  <span class="font-mono text-xxs text-slate-400">
                    {documentAvailable() ? text().available : text().unavailable}
                  </span>
                </div>
                <ul class="mt-3 space-y-2 text-xs text-slate-300/80">
                  <For each={text().documentItems}>
                    {(item) => <li class="rounded bg-slate-950/35 px-2 py-1.5">{item}</li>}
                  </For>
                </ul>
              </section>

              <section
                class={`rounded-lg border p-3 transition ${
                  liveAvailable()
                    ? "border-blue-300/25 bg-blue-300/5"
                    : "border-rose-300/20 bg-rose-300/5 opacity-55"
                }`}
              >
                <div class="flex items-center justify-between gap-2">
                  <h4 class="font-mono text-xs text-slate-100 uppercase">{text().live}</h4>
                  <span class="font-mono text-xxs text-slate-400">
                    {liveAvailable() ? text().available : text().unavailable}
                  </span>
                </div>
                <ul class="mt-3 space-y-2 text-xs text-slate-300/80">
                  <For each={text().liveItems}>
                    {(item) => <li class="rounded bg-slate-950/35 px-2 py-1.5">{item}</li>}
                  </For>
                </ul>
              </section>
            </div>
          </LabCard>
        </div>

        <p
          class="rounded-lg border border-amber-200/15 bg-amber-300/5 px-3 py-2.5 text-sm leading-relaxed text-amber-50/80"
          aria-live="polite"
        >
          {text().takeaway[mode()]}
        </p>
      </div>
    </ConceptLab>
  );
}
