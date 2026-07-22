import { For, createMemo, createSignal } from "solid-js";
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
    return owners;
  });

  const visibleRoutes = createMemo(() => {
    const preferred = [
      "/",
      "/content/",
      "/about",
      "/_astro/app.A1B2.js",
      "/notes",
      "/assets/avatar.webp",
    ];
    return preferred
      .filter((routePath) => manifest().has(routePath))
      .map((routePath) => ({ routePath, owners: manifest().get(routePath) ?? [] }));
  });

  const buildPasses = createMemo(() =>
    [...manifest().values()].every((owners) => owners.length === 1),
  );

  function add(file: string, routePath: string) {
    setFiles((current) => (current.includes(file) ? current : [...current, file]));
    setSelectedRoute(routePath);
  }

  function toggleCollision() {
    setFiles((current) =>
      current.includes(conflictFile)
        ? current.filter((file) => file !== conflictFile)
        : [...current, conflictFile],
    );
    setSelectedRoute("/about");
  }

  function reset() {
    setFiles([...initialFiles]);
    setSelectedRoute("/content/");
  }

  return (
    <section
      class="not-prose mx-auto my-10 max-w-2xl py-3"
      aria-label={text().label}
      data-concept-lab="dist-route-table"
    >
      <div class="overflow-hidden rounded-2xl bg-slate-950 shadow-[0_20px_70px_-35px_rgba(56,189,248,0.35)]">
        <div class="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div class="flex items-center gap-3">
            <span
              class={`size-2.5 rounded-full ${buildPasses() ? "bg-sky-300" : "bg-orange-400"}`}
              aria-hidden="true"
            />
            <p class="font-mono text-sm font-bold tracking-tight text-white">
              {text().build} {buildPasses() ? text().passes : text().stopped}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            class="font-mono text-sm font-semibold text-slate-400 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300 motion-reduce:transition-none"
          >
            {text().reset}
          </button>
        </div>

        <div class="grid gap-px bg-slate-800 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div class="bg-slate-900 p-3 sm:p-4">
            <div class="grid gap-1.5">
              <For each={visibleRoutes()}>
                {(route) => {
                  const hasCollision = () => route.owners.length > 1;
                  const isSelected = () => selectedRoute() === route.routePath;

                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedRoute(route.routePath)}
                      aria-pressed={isSelected()}
                      class={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left font-mono text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 motion-reduce:transition-none ${
                        hasCollision()
                          ? "bg-orange-400 text-slate-950"
                          : isSelected()
                            ? "bg-sky-300 text-slate-950"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <span class="truncate">{route.routePath}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>

          <div class="flex min-h-48 flex-col justify-center bg-slate-950 p-5 sm:p-7">
            <p class="mb-4 font-mono text-sm font-semibold text-slate-500">{selectedRoute()}</p>
            <div class="space-y-2">
              <For each={manifest().get(selectedRoute()) ?? []}>
                {(owner) => (
                  <div
                    class={`rounded-lg px-4 py-3 font-mono text-sm font-bold ${
                      (manifest().get(selectedRoute())?.length ?? 0) > 1
                        ? "bg-orange-400 text-slate-950"
                        : "bg-sky-300/10 text-sky-200"
                    }`}
                  >
                    {owner}
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 bg-slate-900 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => add("assets/avatar.webp", "/assets/avatar.webp")}
            class="rounded-full bg-slate-800 px-3 py-2 font-mono text-sm font-bold text-slate-200 transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 motion-reduce:transition-none"
          >
            {text().addAsset}
          </button>
          <button
            type="button"
            onClick={() => add("notes.html", "/notes")}
            class="rounded-full bg-slate-800 px-3 py-2 font-mono text-sm font-bold text-slate-200 transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 motion-reduce:transition-none"
          >
            {text().addPage}
          </button>
          <button
            type="button"
            onClick={toggleCollision}
            aria-pressed={files().includes(conflictFile)}
            class={`rounded-full px-3 py-2 font-mono text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 motion-reduce:transition-none ${
              files().includes(conflictFile)
                ? "bg-orange-400 text-slate-950"
                : "bg-slate-800 text-orange-300 hover:bg-slate-700"
            }`}
          >
            {text().collide}
          </button>
        </div>
      </div>
    </section>
  );
}
