import { createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type DeploymentShapeLabProps = { locale?: LabLocale };
type Path = "request" | "deploy";

const copy = {
  "en-US": {
    label: "One laptop, two paths",
    request: "request",
    deploy: "deploy next",
    visitor: "visitor",
    repository: "repository",
    tunnel: "cloudflared",
    control: "Dokploy",
    laptop: "laptop",
    container: "container",
    data: "/app/data",
    survived: (count: number) =>
      count === 1 ? "survived 1 replacement" : `survived ${count} replacements`,
    summaries: {
      request: "The request reaches Bun without crossing Dokploy.",
      deploy: "The container changes; the mounted data does not.",
    },
  },
  "pt-BR": {
    label: "Um notebook, dois caminhos",
    request: "requisição",
    deploy: "novo deploy",
    visitor: "visitante",
    repository: "repositório",
    tunnel: "cloudflared",
    control: "Dokploy",
    laptop: "notebook",
    container: "container",
    data: "/app/data",
    survived: (count: number) =>
      count === 1 ? "sobreviveu a 1 substituição" : `sobreviveu a ${count} substituições`,
    summaries: {
      request: "A requisição chega ao Bun sem atravessar o Dokploy.",
      deploy: "O container muda; os dados montados não.",
    },
  },
} as const;

export function DeploymentShapeLab(props: DeploymentShapeLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [path, setPath] = createSignal<Path>("request");
  const [revision, setRevision] = createSignal(1);

  const source = createMemo(() => (path() === "request" ? text().visitor : text().repository));
  const middle = createMemo(() => (path() === "request" ? text().tunnel : text().control));

  function deployNext() {
    setPath("deploy");
    setRevision((value) => value + 1);
  }

  return (
    <LabFrame id="deployment-shape" label={text().label} class="mx-auto max-w-xl">
      <div class="border-y border-white/10 py-4">
        <div class="flex gap-1" role="group" aria-label={text().label}>
          <button
            type="button"
            onClick={() => setPath("request")}
            aria-pressed={path() === "request"}
            class={`rounded-full px-3 py-1.5 font-mono text-[9px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 motion-reduce:transition-none ${
              path() === "request"
                ? "bg-emerald-200 text-slate-950"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            {text().request}
          </button>
          <button
            type="button"
            onClick={deployNext}
            aria-pressed={path() === "deploy"}
            class={`rounded-full px-3 py-1.5 font-mono text-[9px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 motion-reduce:transition-none ${
              path() === "deploy"
                ? "bg-sky-200 text-slate-950"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            {text().deploy}
          </button>
        </div>

        <div class="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.2fr)] items-center gap-2 font-mono text-[9px]">
          <span class="truncate text-slate-400">{source()}</span>
          <span class="text-slate-700" aria-hidden="true">
            →
          </span>
          <span class="truncate text-center text-slate-300">{middle()}</span>
          <span class="text-slate-700" aria-hidden="true">
            →
          </span>
          <span class="min-w-0 text-right text-slate-300">
            <span class="block truncate">{text().laptop}</span>
            <span class="block truncate text-[8px] text-slate-600">
              {text().container} r{String(revision()).padStart(2, "0")}
            </span>
          </span>
        </div>

        <div class="mt-4 flex items-center justify-end gap-2 font-mono text-[9px]">
          <span class="text-amber-200/80">{text().data}</span>
          <span class="text-slate-600">·</span>
          <span class="text-slate-500">{text().survived(revision() - 1)}</span>
        </div>

        <output class="mt-4 block text-xs text-slate-400" aria-live="polite">
          {text().summaries[path()]}
        </output>
      </div>
    </LabFrame>
  );
}
