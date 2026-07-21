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
    survived: (count: number) =>
      (count === 1
        ? t(locale, "survived 1 replacement")
        : t(locale, "survived {count} replacements")
      ).replace("{count}", String(count)),
    summaries: {
      request: t(locale, "The request reaches Bun without crossing Dokploy."),
      deploy: t(locale, "The container changes; the mounted data does not."),
    },
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
      class="not-prose my-8 mx-auto max-w-xl"
      aria-label={text().label}
      data-concept-lab="deployment-shape"
    >
      <div class="border-l border-white/10 py-1 pl-4 sm:pl-6">
        <p class="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-slate-600">
          {text().label}
        </p>

        <div class="space-y-1" role="group" aria-label={text().label}>
          <button
            type="button"
            onClick={() => setPath("request")}
            aria-pressed={path() === "request"}
            class={`group grid w-full grid-cols-[minmax(4.5rem,0.85fr)_1fr_auto] items-center gap-3 py-2 text-left font-mono text-xs transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200 motion-reduce:transition-none ${
              path() === "request" ? "opacity-100" : "opacity-35 hover:opacity-70"
            }`}
          >
            <span class="min-w-0">
              <span class="block truncate text-emerald-200">{text().request}</span>
              <span class="block truncate text-slate-400">{text().visitor}</span>
            </span>
            <span class="flex min-w-0 items-center" aria-hidden="true">
              <span class="truncate text-slate-300">{text().tunnel}</span>
              <span class="ml-3 h-px flex-1 bg-emerald-200/40 transition-colors group-hover:bg-emerald-200/70 motion-reduce:transition-none" />
            </span>
            <span class="text-emerald-200" aria-hidden="true">
              ↘
            </span>
          </button>

          <button
            type="button"
            onClick={deployNext}
            aria-pressed={path() === "deploy"}
            class={`group grid w-full grid-cols-[minmax(4.5rem,0.85fr)_1fr_auto] items-center gap-3 py-2 text-left font-mono text-xs transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-200 motion-reduce:transition-none ${
              path() === "deploy" ? "opacity-100" : "opacity-35 hover:opacity-70"
            }`}
          >
            <span class="min-w-0">
              <span class="block truncate text-sky-200">{text().deploy}</span>
              <span class="block truncate text-slate-400">{text().repository}</span>
            </span>
            <span class="flex min-w-0 items-center" aria-hidden="true">
              <span class="truncate text-slate-300">{text().control}</span>
              <span class="ml-3 h-px flex-1 bg-sky-200/40 transition-colors group-hover:bg-sky-200/70 motion-reduce:transition-none" />
            </span>
            <span class="text-sky-200" aria-hidden="true">
              ↗
            </span>
          </button>
        </div>

        <div class="ml-auto mt-1 w-[min(100%,16rem)] font-mono text-xs">
          <div class="border-t border-white/15 pt-3 text-right">
            <span class="text-slate-300">{text().laptop}</span>
            <output
              class="ml-2 text-slate-500"
              aria-label={`${text().container} r${String(revision()).padStart(2, "0")}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {text().container} r{String(revision()).padStart(2, "0")}
            </output>
          </div>
          <div class="ml-auto flex w-fit items-stretch">
            <span class="mr-3 w-px bg-amber-200/40" aria-hidden="true" />
            <div class="pt-3 text-right">
              <span class="block text-amber-200/80">{text().data}</span>
              <span class="block text-xs text-slate-600">{text().survived(revision() - 1)}</span>
            </div>
          </div>
        </div>

        <output
          class="mt-6 block max-w-md text-sm leading-relaxed text-slate-400"
          aria-live="polite"
          aria-atomic="true"
        >
          {text().summaries[path()]}
        </output>
      </div>
    </section>
  );
}
