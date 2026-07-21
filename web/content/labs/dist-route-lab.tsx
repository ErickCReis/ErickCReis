import { For, Show, createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type DistRouteLabProps = { locale?: Locale };
function getCopy(locale: Locale) {
  return {
    label: t(locale, "Build-time static route compiler"),
    addAsset: t(locale, "+ asset"),
    addPage: t(locale, "+ HTML page"),
    collide: t(locale, "toggle collision"),
    reset: t(locale, "reset"),
    build: t(locale, "build"),
    passes: t(locale, "passes"),
    stopped: t(locale, "stopped"),
    duplicate: t(locale, "duplicate /about owner"),
    noBinary: t(locale, "No binary is emitted until every route has one owner."),
    request: t(locale, "request"),
    served: t(locale, "served from"),
    cache: t(locale, "cache"),
    empty: t(locale, "Choose a route."),
  };
}

const initialFiles = ["index.html", "content/index.html", "about.html", "_astro/app.A1B2.js"];
const conflictFile = "about/index.html";

function routesFor(file: string) {
  const routePath = `/${file.replace(/^\/+/, "")}`;
  const routes = new Set([routePath]);

  if (routePath.endsWith("/index.html")) {
    const clean = routePath.slice(0, -"/index.html".length) || "/";
    routes.add(clean);
    if (clean !== "/") routes.add(`${clean}/`);
  } else if (routePath.endsWith(".html")) {
    routes.add(routePath.slice(0, -".html".length) || "/");
  }

  return [...routes];
}

function cacheFor(routePath: string, file: string) {
  if (routePath.startsWith("/_astro/")) return "public, max-age=31536000, immutable";
  if (file.endsWith(".html")) return "no-cache";
  return "public, max-age=3600";
}

export function DistRouteLab(props: DistRouteLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const [files, setFiles] = createSignal([...initialFiles]);
  const [selectedRoute, setSelectedRoute] = createSignal("/content/");

  const manifest = createMemo(() => {
    const owners = new Map<string, string[]>();
    for (const file of files()) {
      for (const route of routesFor(file)) {
        owners.set(route, [...(owners.get(route) ?? []), file]);
      }
    }
    return [...owners]
      .map(([routePath, routeOwners]) => ({ routePath, owners: routeOwners }))
      .sort((left, right) => left.routePath.localeCompare(right.routePath));
  });
  const collisions = createMemo(() => manifest().filter((route) => route.owners.length > 1));
  const buildPasses = createMemo(() => collisions().length === 0);
  const activeRoute = createMemo(() =>
    manifest().find((route) => route.routePath === selectedRoute()),
  );

  function add(file: string) {
    setFiles((current) => (current.includes(file) ? current : [...current, file]));
  }

  function toggleCollision() {
    setFiles((current) =>
      current.includes(conflictFile)
        ? current.filter((file) => file !== conflictFile)
        : [...current, conflictFile],
    );
  }

  function reset() {
    setFiles([...initialFiles]);
    setSelectedRoute("/content/");
  }

  const controlClass =
    "font-mono text-xs text-slate-600 transition-colors hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200 motion-reduce:transition-none";

  return (
    <section
      class="not-prose my-10 mx-auto max-w-2xl"
      aria-label={text().label}
      data-concept-lab="dist-route-table"
    >
      <div class="border-y border-white/10 py-4">
        <div class="flex min-w-0 items-center gap-3 font-mono">
          <span class="shrink-0 text-xs text-emerald-200">dist/</span>
          <span class="h-px min-w-4 flex-1 bg-white/10" aria-hidden="true" />
          <span class="text-xs text-slate-700">{files().length}</span>
          <span class="text-xs text-slate-600">→</span>
          <span class="text-xs text-slate-700">{manifest().length}</span>
          <span class="text-xs text-slate-600">→</span>
          <span
            class={`size-1.5 shrink-0 ${buildPasses() ? "bg-emerald-200" : "bg-rose-300"}`}
            aria-hidden="true"
          />
          <span class={buildPasses() ? "text-xs text-emerald-200" : "text-xs text-rose-200"}>
            {text().build} {buildPasses() ? text().passes : text().stopped}
          </span>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" onClick={() => add("assets/avatar.webp")} class={controlClass}>
            {text().addAsset}
          </button>
          <button type="button" onClick={() => add("notes.html")} class={controlClass}>
            {text().addPage}
          </button>
          <button
            type="button"
            onClick={toggleCollision}
            aria-pressed={files().includes(conflictFile)}
            class={`font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200 motion-reduce:transition-none ${
              files().includes(conflictFile)
                ? "text-rose-200 underline decoration-rose-300/40 underline-offset-4"
                : "text-slate-600 hover:text-rose-200"
            }`}
          >
            {text().collide}
          </button>
          <button
            type="button"
            onClick={reset}
            class="ml-auto font-mono text-xs text-slate-700 transition-colors hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-300 motion-reduce:transition-none"
          >
            {text().reset}
          </button>
        </div>

        <div class="mt-6">
          <For each={manifest()}>
            {(route, index) => {
              const hasCollision = () => route.owners.length > 1;
              const isSelected = () => selectedRoute() === route.routePath;

              return (
                <button
                  type="button"
                  onClick={() => setSelectedRoute(route.routePath)}
                  aria-pressed={isSelected()}
                  class={`group grid w-full grid-cols-[1.25rem_minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-2 border-t py-2 text-left font-mono transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 motion-reduce:transition-none ${
                    hasCollision()
                      ? "border-rose-300/25 bg-rose-300/[0.035]"
                      : isSelected()
                        ? "border-emerald-200/25"
                        : "border-white/[0.06] hover:border-white/15"
                  }`}
                >
                  <span class="pt-px text-xs tabular-nums text-slate-800">
                    {String(index() + 1).padStart(2, "0")}
                  </span>
                  <span
                    class={`min-w-0 truncate text-xs ${
                      hasCollision()
                        ? "text-rose-200"
                        : isSelected()
                          ? "text-emerald-200"
                          : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  >
                    {route.routePath}
                  </span>
                  <span class="min-w-0 space-y-1 text-xs">
                    <For each={route.owners}>
                      {(owner) => (
                        <span
                          class={`flex min-w-0 items-center gap-2 ${
                            hasCollision() ? "text-rose-200/70" : "text-slate-700"
                          }`}
                        >
                          <span class="text-slate-800" aria-hidden="true">
                            ←
                          </span>
                          <span class="truncate">{owner}</span>
                        </span>
                      )}
                    </For>
                  </span>
                </button>
              );
            }}
          </For>
        </div>

        <Show when={!buildPasses()}>
          <div class="mt-4 border-l border-rose-300/40 pl-3">
            <p class="font-mono text-xs text-rose-200">{text().duplicate}</p>
            <p class="mt-1 text-sm leading-relaxed text-slate-500">{text().noBinary}</p>
          </div>
        </Show>

        <output
          class={`mt-5 block min-h-10 border-t pt-3 font-mono text-xs leading-relaxed ${
            buildPasses()
              ? "border-cyan-200/15 text-slate-500"
              : "border-white/[0.06] text-slate-700"
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          <Show
            when={buildPasses() && activeRoute()}
            fallback={buildPasses() ? text().empty : text().noBinary}
          >
            {(route) => (
              <span class="grid gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <span class="truncate text-cyan-200">
                  {text().request} <code>{route().routePath}</code>
                </span>
                <span class="min-w-0 text-slate-600">
                  {text().served} <span class="text-slate-400">{route().owners[0]}</span>
                  <span class="mx-2 text-slate-800">·</span>
                  {text().cache}: {cacheFor(route().routePath, route().owners[0])}
                </span>
              </span>
            )}
          </Show>
        </output>
      </div>
    </section>
  );
}
