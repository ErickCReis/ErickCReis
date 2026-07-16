import { createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type DeploymentShapeLabProps = { locale?: LabLocale };
type Path = "request" | "deploy";

const copy = {
  "en-US": {
    label: "One laptop, two paths",
    eyebrow: "self-hosted shape",
    title: "Trace what reaches the laptop",
    intro: "A request and a release share a destination, not a route.",
    actionsLabel: "Choose a path to trace",
    actions: { request: "Trace request", deploy: "Deploy next" },
    pathLabels: { request: "public request", deploy: "release" },
    visitor: "visitor",
    repository: "repository",
    tunnel: "cloudflared",
    controlPlane: "Dokploy",
    laptop: "unused laptop",
    container: "replaceable container",
    runtime: "Bun + Elysia",
    responsibilities: "Astro · API · SSE · WS · jobs",
    volume: "host volume",
    dataDirectory: "/app/data",
    mounted: "mounted outside the container",
    version: "revision",
    requestSummary:
      "The request crosses the tunnel and reaches the server. Dokploy is not on this path.",
    deploySummary:
      "Dokploy replaces the container. The mounted data directory stays on the laptop.",
    survived: (count: number) =>
      count === 1 ? "survived 1 replacement" : `survived ${count} replacements`,
  },
  "pt-BR": {
    label: "Um notebook, dois caminhos",
    eyebrow: "formato self-hosted",
    title: "Veja o que chega ao notebook",
    intro: "Uma requisição e uma versão compartilham o destino, não o caminho.",
    actionsLabel: "Escolha um caminho para acompanhar",
    actions: { request: "Seguir requisição", deploy: "Novo deploy" },
    pathLabels: { request: "requisição pública", deploy: "versão" },
    visitor: "visitante",
    repository: "repositório",
    tunnel: "cloudflared",
    controlPlane: "Dokploy",
    laptop: "notebook parado",
    container: "container substituível",
    runtime: "Bun + Elysia",
    responsibilities: "Astro · API · SSE · WS · tarefas",
    volume: "volume do host",
    dataDirectory: "/app/data",
    mounted: "montado fora do container",
    version: "revisão",
    requestSummary:
      "A requisição atravessa o túnel e chega ao servidor. O Dokploy não participa desse caminho.",
    deploySummary: "O Dokploy substitui o container. O diretório montado continua no notebook.",
    survived: (count: number) =>
      count === 1 ? "sobreviveu a 1 substituição" : `sobreviveu a ${count} substituições`,
  },
} as const;

export function DeploymentShapeLab(props: DeploymentShapeLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [path, setPath] = createSignal<Path>("request");
  const [revision, setRevision] = createSignal(1);

  const revisionLabel = createMemo(() => `r${revision().toString().padStart(2, "0")}`);
  const summary = createMemo(() =>
    path() === "request" ? text().requestSummary : text().deploySummary,
  );

  function traceRequest() {
    setPath("request");
  }

  function deployNext() {
    setPath("deploy");
    setRevision((current) => current + 1);
  }

  const nodeClass = (nodePath: Path) => {
    if (path() !== nodePath) {
      return "border-slate-700/70 bg-slate-950/55 text-slate-500";
    }

    return nodePath === "request"
      ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.08)]"
      : "border-sky-300/50 bg-sky-300/10 text-sky-100 shadow-[0_0_24px_rgba(125,211,252,0.08)]";
  };

  const arrowClass = (nodePath: Path) => {
    if (path() !== nodePath) return "text-slate-700";
    return nodePath === "request" ? "text-emerald-300" : "text-sky-300";
  };

  return (
    <LabFrame id="deployment-shape" label={text().label} class="mx-auto max-w-xl">
      <div class="overflow-hidden rounded-[1.75rem] border border-emerald-200/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.09),transparent_42%),#050914] shadow-xl shadow-slate-950/25">
        <header class="border-b border-slate-200/10 px-4 py-4 sm:px-5">
          <p class="font-mono text-[9px] tracking-[0.22em] text-emerald-200/55 uppercase">
            {text().eyebrow}
          </p>
          <div class="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 class="text-sm font-medium text-slate-100">{text().title}</h3>
              <p class="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{text().intro}</p>
            </div>

            <div
              class="inline-flex w-fit rounded-full border border-slate-200/10 bg-slate-950/65 p-1"
              role="group"
              aria-label={text().actionsLabel}
            >
              <button
                type="button"
                onClick={traceRequest}
                aria-pressed={path() === "request"}
                class={`rounded-full px-3 py-1.5 font-mono text-[9px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 motion-reduce:transition-none ${
                  path() === "request"
                    ? "bg-emerald-300 text-slate-950"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                {text().actions.request}
              </button>
              <button
                type="button"
                onClick={deployNext}
                aria-pressed={path() === "deploy"}
                class={`rounded-full px-3 py-1.5 font-mono text-[9px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 motion-reduce:transition-none ${
                  path() === "deploy"
                    ? "bg-sky-300 text-slate-950"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                {text().actions.deploy}
              </button>
            </div>
          </div>
        </header>

        <div class="p-3 sm:p-4">
          <div class="grid grid-cols-[minmax(0,0.72fr)_auto_minmax(0,0.9fr)_auto_minmax(0,1.5fr)] grid-rows-2 items-stretch gap-x-1.5 gap-y-2 sm:gap-x-2.5">
            <div
              class={`flex min-w-0 flex-col justify-center rounded-xl border px-2 py-3 text-center transition-colors motion-reduce:transition-none ${nodeClass("request")}`}
            >
              <span class="truncate font-mono text-[8px] tracking-wide uppercase">
                {text().pathLabels.request}
              </span>
              <span class="mt-1 truncate text-[10px] text-current">{text().visitor}</span>
            </div>
            <span
              class={`grid place-items-center font-mono text-xs transition-colors motion-reduce:transition-none ${arrowClass("request")}`}
              aria-hidden="true"
            >
              →
            </span>
            <div
              class={`grid min-w-0 place-items-center rounded-xl border px-1.5 py-3 text-center font-mono text-[9px] transition-colors motion-reduce:transition-none ${nodeClass("request")}`}
            >
              <span class="truncate">{text().tunnel}</span>
            </div>
            <span
              class={`grid place-items-center font-mono text-xs transition-colors motion-reduce:transition-none ${arrowClass("request")}`}
              aria-hidden="true"
            >
              →
            </span>

            <div class="row-span-2 flex min-w-0 flex-col rounded-2xl border border-amber-200/20 bg-amber-100/[0.035] p-2 sm:p-2.5">
              <div class="flex items-center justify-between gap-1 font-mono text-[8px] text-amber-100/50 uppercase">
                <span class="truncate">{text().laptop}</span>
                <span class="size-1.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </div>

              <div
                class={`mt-2 min-w-0 rounded-xl border p-2 transition-colors motion-reduce:transition-none ${
                  path() === "request"
                    ? "border-emerald-300/35 bg-emerald-300/[0.07]"
                    : "border-sky-300/35 bg-sky-300/[0.07]"
                }`}
              >
                <div class="flex items-center justify-between gap-1 font-mono text-[8px] text-slate-400">
                  <span class="truncate">{text().container}</span>
                  <output
                    class="shrink-0 text-slate-100"
                    aria-label={`${text().version} ${revision()}`}
                  >
                    {revisionLabel()}
                  </output>
                </div>
                <p class="mt-2 truncate font-mono text-[10px] text-slate-100">{text().runtime}</p>
                <p class="mt-0.5 truncate font-mono text-[7px] text-slate-500">
                  {text().responsibilities}
                </p>
              </div>

              <div
                class="mx-auto h-2.5 border-l border-dashed border-amber-200/30"
                aria-hidden="true"
              />

              <div class="min-w-0 rounded-xl border border-amber-200/20 bg-amber-200/[0.06] p-2">
                <div class="flex items-center justify-between gap-1 font-mono text-[8px] text-amber-100/45">
                  <span class="truncate">{text().volume}</span>
                  <span class="size-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
                </div>
                <p class="mt-1 truncate font-mono text-[9px] text-amber-100">
                  {text().dataDirectory}
                </p>
                <p class="mt-0.5 truncate font-mono text-[7px] text-slate-500">{text().mounted}</p>
              </div>
            </div>

            <div
              class={`flex min-w-0 flex-col justify-center rounded-xl border px-2 py-3 text-center transition-colors motion-reduce:transition-none ${nodeClass("deploy")}`}
            >
              <span class="truncate font-mono text-[8px] tracking-wide uppercase">
                {text().pathLabels.deploy}
              </span>
              <span class="mt-1 truncate text-[10px] text-current">{text().repository}</span>
            </div>
            <span
              class={`grid place-items-center font-mono text-xs transition-colors motion-reduce:transition-none ${arrowClass("deploy")}`}
              aria-hidden="true"
            >
              →
            </span>
            <div
              class={`grid min-w-0 place-items-center rounded-xl border px-1.5 py-3 text-center font-mono text-[9px] transition-colors motion-reduce:transition-none ${nodeClass("deploy")}`}
            >
              <span class="truncate">{text().controlPlane}</span>
            </div>
            <span
              class={`grid place-items-center font-mono text-xs transition-colors motion-reduce:transition-none ${arrowClass("deploy")}`}
              aria-hidden="true"
            >
              →
            </span>
          </div>

          <div class="mt-3 flex flex-col gap-1 rounded-xl border border-slate-200/10 bg-slate-950/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <output class="text-[10px] leading-relaxed text-slate-300" aria-live="polite">
              {summary()}
            </output>
            <span class="shrink-0 font-mono text-[8px] text-amber-200/65">
              {text().dataDirectory} · {text().survived(revision() - 1)}
            </span>
          </div>
        </div>
      </div>
    </LabFrame>
  );
}
