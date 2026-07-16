import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type IslandBoundaryLabProps = { locale?: LabLocale };
type Architecture = "island" | "client";
type Fault = "none" | "javascript" | "stream";

const copy = {
  "en-US": {
    label: "Island boundary failure lab",
    architectures: { island: "Astro + island", client: "client-owned" },
    faults: { none: "healthy", javascript: "no JavaScript", stream: "no stream" },
    document: "article HTML",
    content: "Selected work · notes · contact",
    island: "Solid island",
    live: "telemetry · 2 visitors",
    offline: "telemetry · offline",
    absent: "island absent",
    waiting: "document waiting for JavaScript",
    outcomes: {
      island: {
        none: "The document and live layer are available.",
        javascript: "The document survives; the island does not start.",
        stream: "The document survives; the island reports offline.",
      },
      client: {
        none: "JavaScript renders the document and live layer.",
        javascript: "Nothing can render without JavaScript.",
        stream: "The rendered document stays; live data stops.",
      },
    },
  },
  "pt-BR": {
    label: "Laboratório de falhas na fronteira da ilha",
    architectures: { island: "Astro + ilha", client: "controlado pelo cliente" },
    faults: { none: "funcionando", javascript: "sem JavaScript", stream: "sem fluxo" },
    document: "HTML do artigo",
    content: "Trabalhos · notas · contato",
    island: "ilha do Solid",
    live: "telemetria · 2 visitantes",
    offline: "telemetria · desconectada",
    absent: "ilha ausente",
    waiting: "documento aguardando JavaScript",
    outcomes: {
      island: {
        none: "O documento e a camada ao vivo estão disponíveis.",
        javascript: "O documento sobrevive; a ilha não inicia.",
        stream: "O documento sobrevive; a ilha informa a desconexão.",
      },
      client: {
        none: "O JavaScript renderiza o documento e a camada ao vivo.",
        javascript: "Nada pode ser renderizado sem JavaScript.",
        stream: "O documento renderizado fica; os dados ao vivo param.",
      },
    },
  },
} as const;

const architectures: Architecture[] = ["island", "client"];
const faults: Fault[] = ["none", "javascript", "stream"];

export function IslandBoundaryLab(props: IslandBoundaryLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [architecture, setArchitecture] = createSignal<Architecture>("island");
  const [fault, setFault] = createSignal<Fault>("none");

  const javascriptReady = createMemo(() => fault() !== "javascript");
  const documentReady = createMemo(() => architecture() === "island" || javascriptReady());
  const islandReady = createMemo(() => javascriptReady());
  const streamReady = createMemo(() => islandReady() && fault() !== "stream");
  const outcome = createMemo(() => text().outcomes[architecture()][fault()]);

  const buttonClass = (active: boolean) =>
    `rounded-full px-2.5 py-1.5 font-mono text-[9px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-reduce:transition-none ${
      active ? "bg-cyan-200 text-slate-950" : "text-slate-500 hover:text-slate-200"
    }`;

  return (
    <LabFrame id="island-boundary" label={text().label} class="mx-auto max-w-xl">
      <div class="border-y border-white/10 py-4">
        <div class="flex flex-wrap gap-x-4 gap-y-2">
          <div class="flex gap-1" role="group" aria-label={text().label}>
            <For each={architectures}>
              {(choice) => (
                <button
                  type="button"
                  onClick={() => setArchitecture(choice)}
                  aria-pressed={architecture() === choice}
                  class={buttonClass(architecture() === choice)}
                >
                  {text().architectures[choice]}
                </button>
              )}
            </For>
          </div>
          <div class="flex flex-wrap gap-1" role="group" aria-label={text().label}>
            <For each={faults}>
              {(choice) => (
                <button
                  type="button"
                  onClick={() => setFault(choice)}
                  aria-pressed={fault() === choice}
                  class={buttonClass(fault() === choice)}
                >
                  {text().faults[choice]}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="mt-5 grid min-h-28 gap-4 sm:grid-cols-[1fr_auto_0.75fr] sm:items-center">
          <div class="min-w-0">
            <p class="font-mono text-[9px] text-emerald-200/70">{text().document}</p>
            <Show
              when={documentReady()}
              fallback={<p class="mt-3 text-xs text-rose-200/70">{text().waiting}</p>}
            >
              <p class="mt-3 truncate font-serif text-lg text-slate-200">{text().content}</p>
              <span class="mt-3 block h-px w-2/3 bg-slate-700" />
            </Show>
          </div>

          <span class="hidden text-slate-700 sm:block" aria-hidden="true">
            +
          </span>

          <div class="min-w-0 sm:border-l sm:border-dashed sm:border-white/10 sm:pl-4">
            <p class="font-mono text-[9px] text-cyan-200/70">{text().island}</p>
            <Show
              when={islandReady()}
              fallback={<p class="mt-3 text-xs text-slate-600">{text().absent}</p>}
            >
              <p class={`mt-3 text-xs ${streamReady() ? "text-slate-300" : "text-amber-200/70"}`}>
                {streamReady() ? text().live : text().offline}
              </p>
            </Show>
          </div>
        </div>

        <output class="mt-4 block text-xs text-slate-400" aria-live="polite" aria-atomic="true">
          {outcome()}
        </output>
      </div>
    </LabFrame>
  );
}
