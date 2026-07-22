import { createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type DeploymentShapeLabProps = { locale?: Locale };
type Path = "request" | "deploy";

function getCopy(locale: Locale) {
  return {
    label: t(locale, "One laptop, two paths"),
    request: t(locale, "request"),
    deploy: t(locale, "deploy next"),
    visitor: t(locale, "visitor"),
    repository: t(locale, "repository"),
    tunnel: t(locale, "cloudflared"),
    control: t(locale, "Dokploy"),
    laptop: t(locale, "laptop"),
    container: t(locale, "container"),
    data: t(locale, "/app/data"),
  };
}

export function DeploymentShapeLab(props: DeploymentShapeLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const [path, setPath] = createSignal<Path>("request");
  const [revision, setRevision] = createSignal(1);

  function deployNext() {
    setPath("deploy");
    setRevision((value) => value + 1);
  }

  return (
    <section
      class="not-prose mx-auto my-10 max-w-xl font-mono"
      aria-label={text().label}
      data-concept-lab="deployment-shape"
    >
      <div class="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-stretch">
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-1" role="group" aria-label={text().label}>
          <button
            type="button"
            onClick={() => setPath("request")}
            aria-pressed={path() === "request"}
            class={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transition-none ${
              path() === "request"
                ? "bg-cyan-300 text-slate-950"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            {text().request}
          </button>
          <button
            type="button"
            onClick={deployNext}
            aria-pressed={path() === "deploy"}
            class={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 motion-reduce:transition-none ${
              path() === "deploy"
                ? "bg-violet-300 text-slate-950"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            {text().deploy}
          </button>
        </div>

        <div class="grid min-h-44 grid-cols-[minmax(0,1fr)_3rem_minmax(7rem,0.8fr)] grid-rows-[1fr_auto] overflow-hidden rounded-2xl bg-slate-950 shadow-[inset_0_0_0_1px_rgb(51_65_85)]">
          <div class="flex min-w-0 flex-col justify-center px-4 py-5 sm:px-5">
            <span
              class={`truncate text-sm font-semibold ${
                path() === "request" ? "text-cyan-200" : "text-violet-200"
              }`}
            >
              {path() === "request" ? text().visitor : text().repository}
            </span>
            <span class="mt-1 truncate text-xs text-slate-500">
              {path() === "request" ? text().tunnel : text().control}
            </span>
          </div>

          <div class="relative" aria-hidden="true">
            <span
              class={`absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2 ${
                path() === "request" ? "bg-cyan-300" : "bg-violet-300"
              }`}
            />
            <span
              class={`absolute top-1/2 right-0 size-2 -translate-y-1/2 rotate-45 border-t-2 border-r-2 ${
                path() === "request" ? "border-cyan-300" : "border-violet-300"
              }`}
            />
          </div>

          <div class="flex flex-col justify-center bg-slate-900 px-4 py-5">
            <span class="text-xs font-medium text-slate-500">{text().laptop}</span>
            <output class="mt-1 text-sm font-bold text-white" aria-live="polite" aria-atomic="true">
              {text().container} {String(revision()).padStart(2, "0")}
            </output>
          </div>

          <div class="col-span-3 flex items-center justify-between bg-amber-300 px-4 py-2.5 text-slate-950 sm:px-5">
            <span class="text-xs font-semibold">{text().data}</span>
            <span class="h-1.5 w-12 rounded-full bg-slate-950/25" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
