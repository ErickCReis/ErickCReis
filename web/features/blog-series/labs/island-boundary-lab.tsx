import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type IslandBoundaryLabProps = { locale?: LabLocale };
type Architecture = "island" | "client";
type Fault = "none" | "javascript" | "stream";

const copy = {
  "en-US": {
    label: "Island boundary failure lab",
    eyebrow: "Boundary inspector",
    question: "Who owns the document?",
    architectures: {
      island: "Astro document",
      client: "client-owned document",
    },
    boundary: {
      island: "Solid live island",
      client: "client boundary",
    },
    faultPrompt: "Inject a failure",
    faults: {
      none: "all healthy",
      javascript: "block JavaScript",
      stream: "drop live stream",
    },
    address: "erickr.dev / portfolio",
    title: "Selected work",
    nav: ["work", "notes", "contact"],
    documentLayer: {
      island: "HTML · build output",
      client: "document · client render",
    },
    projects: ["glim-node", "local-box"],
    telemetry: "telemetry",
    visitors: "2 visitors",
    streaming: "streaming",
    offline: "offline",
    islandAbsent: "live island did not start",
    clientWaiting: "the document is waiting for JavaScript",
    checks: {
      document: "document",
      javascript: "JavaScript",
      stream: "live stream",
      ready: "ready",
      blocked: "blocked",
      connected: "connected",
      disconnected: "disconnected",
    },
    outcomes: {
      island: {
        none: "The generated document and the live layer are both available.",
        javascript: "The document survives. Only the browser-only island is absent.",
        stream: "The document survives, while the live island exposes its offline state.",
      },
      client: {
        none: "The client renders the document and connects the live layer.",
        javascript: "The client-owned document cannot render without JavaScript.",
        stream: "The rendered document stays, while live data becomes unavailable.",
      },
    },
  },
  "pt-BR": {
    label: "Laboratório de falhas na fronteira da ilha",
    eyebrow: "Inspetor de fronteiras",
    question: "Quem controla o documento?",
    architectures: {
      island: "documento do Astro",
      client: "documento do cliente",
    },
    boundary: {
      island: "ilha interativa do Solid",
      client: "fronteira do cliente",
    },
    faultPrompt: "Injete uma falha",
    faults: {
      none: "tudo funcionando",
      javascript: "bloquear JavaScript",
      stream: "derrubar fluxo ao vivo",
    },
    address: "erickr.dev / portfólio",
    title: "Trabalhos selecionados",
    nav: ["trabalho", "notas", "contato"],
    documentLayer: {
      island: "HTML · saída do build",
      client: "documento · render do cliente",
    },
    projects: ["glim-node", "local-box"],
    telemetry: "telemetria",
    visitors: "2 visitantes",
    streaming: "recebendo dados",
    offline: "desconectado",
    islandAbsent: "a ilha interativa não iniciou",
    clientWaiting: "o documento está aguardando o JavaScript",
    checks: {
      document: "documento",
      javascript: "JavaScript",
      stream: "fluxo ao vivo",
      ready: "pronto",
      blocked: "bloqueado",
      connected: "conectado",
      disconnected: "desconectado",
    },
    outcomes: {
      island: {
        none: "O documento gerado e a camada interativa estão disponíveis.",
        javascript: "O documento sobrevive. Apenas a ilha do navegador fica ausente.",
        stream: "O documento sobrevive, enquanto a ilha expõe seu estado desconectado.",
      },
      client: {
        none: "O cliente renderiza o documento e conecta a camada interativa.",
        javascript: "O documento controlado pelo cliente não renderiza sem JavaScript.",
        stream: "O documento renderizado permanece, mas os dados ao vivo ficam indisponíveis.",
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
  const streamReady = createMemo(() => javascriptReady() && fault() !== "stream");
  const outcome = createMemo(() => text().outcomes[architecture()][fault()]);

  const controlClass = (selected: boolean) =>
    `rounded-full px-3 py-1.5 font-mono text-xxs transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ${
      selected
        ? "bg-cyan-200 text-slate-950"
        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
    }`;

  return (
    <LabFrame
      id="island-boundary"
      label={text().label}
      class="mx-auto max-w-xl overflow-hidden rounded-[1.75rem] border border-cyan-200/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.11),transparent_38%),#050b14] p-3 shadow-2xl shadow-cyan-950/25 sm:p-4"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="font-mono text-[9px] tracking-[0.18em] text-cyan-200/55 uppercase">
            {text().eyebrow}
          </p>
          <p class="mt-1 text-sm font-medium text-slate-100">{text().question}</p>
        </div>

        <div
          class="inline-flex self-start rounded-full border border-white/5 bg-slate-950/65 p-1 sm:self-auto"
          role="group"
          aria-label={text().question}
        >
          <For each={architectures}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setArchitecture(choice)}
                aria-pressed={architecture() === choice}
                class={controlClass(architecture() === choice)}
              >
                {text().architectures[choice]}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
        <div class="flex h-9 items-center gap-1.5 border-b border-white/8 bg-slate-900/75 px-3">
          <span class="size-2 rounded-full bg-rose-300/60" />
          <span class="size-2 rounded-full bg-amber-200/60" />
          <span class="size-2 rounded-full bg-emerald-200/60" />
          <span class="ml-2 truncate rounded-full bg-slate-950/70 px-3 py-1 font-mono text-[8px] text-slate-500">
            {text().address}
          </span>
          <span
            class={`ml-auto rounded-full border px-2 py-0.5 font-mono text-[8px] ${
              architecture() === "island"
                ? "border-cyan-200/20 text-cyan-100/70"
                : "border-violet-200/20 text-violet-100/70"
            }`}
          >
            {text().boundary[architecture()]}
          </span>
        </div>

        <div
          class="relative min-h-60 overflow-hidden bg-[linear-gradient(145deg,rgba(15,23,42,0.78),rgba(2,6,23,0.96))] p-4 sm:min-h-56"
          aria-hidden="true"
        >
          <Show
            when={documentReady()}
            fallback={
              <div class="absolute inset-3 grid place-items-center rounded-xl border border-dashed border-rose-300/20 bg-rose-300/[0.025]">
                <div class="text-center">
                  <span class="mx-auto mb-3 block size-2 rounded-full bg-rose-300" />
                  <p class="font-mono text-xs text-rose-100/75">{text().clientWaiting}</p>
                </div>
              </div>
            }
          >
            <Show when={architecture() === "client"}>
              <div class="pointer-events-none absolute inset-2 rounded-xl border border-dashed border-violet-300/30" />
            </Show>

            <div class="relative z-0 max-w-[17rem]">
              <span class="rounded-full border border-emerald-200/15 bg-emerald-300/5 px-2 py-1 font-mono text-[8px] tracking-wider text-emerald-100/60 uppercase">
                {text().documentLayer[architecture()]}
              </span>
              <div class="mt-4 flex items-end justify-between gap-3">
                <strong class="font-serif text-xl text-slate-100">{text().title}</strong>
                <div class="hidden gap-2 font-mono text-[8px] text-slate-600 min-[390px]:flex">
                  <For each={text().nav}>{(item) => <span>{item}</span>}</For>
                </div>
              </div>
              <div class="mt-4 space-y-2">
                <For each={text().projects}>
                  {(project, index) => (
                    <div class="flex items-center gap-2 border-b border-white/7 pb-2">
                      <span class="font-mono text-[8px] text-slate-700">0{index() + 1}</span>
                      <span class="font-mono text-[9px] text-slate-400">{project}</span>
                      <span class="ml-auto h-px w-8 bg-slate-700/60" />
                    </div>
                  )}
                </For>
              </div>
            </div>

            <Show
              when={javascriptReady()}
              fallback={
                <div class="absolute right-3 bottom-3 rounded-lg border border-dashed border-slate-600/50 bg-slate-950/85 px-3 py-2 font-mono text-[8px] text-slate-600">
                  {text().islandAbsent}
                </div>
              }
            >
              <div
                class={`absolute right-3 bottom-3 w-44 rounded-xl border border-dashed p-2 transition-colors motion-reduce:transition-none sm:w-48 ${
                  streamReady()
                    ? "border-cyan-200/40 bg-cyan-300/[0.07]"
                    : "border-amber-200/35 bg-amber-300/[0.05]"
                }`}
              >
                <div class="mb-2 flex items-center justify-between gap-2 font-mono text-[8px]">
                  <span class={streamReady() ? "text-cyan-100/70" : "text-amber-100/70"}>
                    {text().boundary.island}
                  </span>
                  <span class={streamReady() ? "text-emerald-200" : "text-amber-200"}>
                    {streamReady() ? text().streaming : text().offline}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-1.5">
                  <span class="rounded-md bg-slate-950/80 px-2 py-2 font-mono text-[8px] text-slate-300">
                    {text().telemetry}
                  </span>
                  <span class="rounded-md bg-slate-950/80 px-2 py-2 font-mono text-[8px] text-slate-300">
                    {streamReady() ? text().visitors : "—"}
                  </span>
                </div>
                <Show when={streamReady()}>
                  <span class="absolute -top-3 right-7 text-base text-violet-200 drop-shadow-[0_0_6px_rgba(196,181,253,0.7)]">
                    ↖
                  </span>
                  <span class="absolute -top-1 right-1 size-1.5 rounded-full bg-cyan-200 motion-safe:animate-pulse" />
                </Show>
              </div>
            </Show>
          </Show>
        </div>
      </div>

      <div class="mt-3">
        <p class="font-mono text-[9px] tracking-wider text-slate-500 uppercase">
          {text().faultPrompt}
        </p>
        <div class="mt-1.5 flex flex-wrap gap-1" role="group" aria-label={text().faultPrompt}>
          <For each={faults}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setFault(choice)}
                aria-pressed={fault() === choice}
                class={controlClass(fault() === choice)}
              >
                {text().faults[choice]}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-1.5" aria-hidden="true">
        <StatusCheck
          label={text().checks.document}
          value={documentReady() ? text().checks.ready : text().checks.blocked}
          ready={documentReady()}
        />
        <StatusCheck
          label={text().checks.javascript}
          value={javascriptReady() ? text().checks.ready : text().checks.blocked}
          ready={javascriptReady()}
        />
        <StatusCheck
          label={text().checks.stream}
          value={streamReady() ? text().checks.connected : text().checks.disconnected}
          ready={streamReady()}
        />
      </div>

      <output
        class="mt-3 block min-h-9 border-t border-white/8 pt-3 text-xs leading-5 text-slate-300"
        aria-live="polite"
        aria-atomic="true"
      >
        {outcome()}
      </output>
    </LabFrame>
  );
}

function StatusCheck(props: { label: string; value: string; ready: boolean }) {
  return (
    <div class="rounded-lg border border-white/5 bg-slate-950/55 px-2 py-2 font-mono">
      <span class="block truncate text-[8px] text-slate-600">{props.label}</span>
      <span
        class={`mt-0.5 block truncate text-[9px] ${
          props.ready ? "text-emerald-200/80" : "text-rose-200/80"
        }`}
      >
        {props.ready ? "●" : "○"} {props.value}
      </span>
    </div>
  );
}
