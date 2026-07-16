import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type DistRouteLabProps = { locale?: LabLocale };

const copy = {
  "en-US": {
    label: "Build-time static route compiler",
    addAsset: "+ asset",
    addPage: "+ HTML page",
    collide: "toggle collision",
    reset: "reset",
    build: "build",
    passes: "passes",
    stopped: "stopped",
    duplicate: "duplicate /about owner",
    noBinary: "No binary is emitted until every route has one owner.",
    request: "request",
    served: "served from",
    cache: "cache",
    empty: "Choose a route.",
  },
  "pt-BR": {
    label: "Compilador de rotas estáticas em tempo de build",
    addAsset: "+ asset",
    addPage: "+ página HTML",
    collide: "alternar conflito",
    reset: "reiniciar",
    build: "build",
    passes: "aprovado",
    stopped: "interrompido",
    duplicate: "proprietário duplicado em /about",
    noBinary: "Nenhum binário é emitido enquanto uma rota tiver mais de um proprietário.",
    request: "requisição",
    served: "servida por",
    cache: "cache",
    empty: "Escolha uma rota.",
  },
} as const;

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
  const text = () => selectLabCopy(props.locale, copy);
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

  return (
    <LabFrame id="dist-route-table" label={text().label} class="mx-auto max-w-2xl">
      <div class="border-y border-white/10 py-4">
        <div class="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => add("assets/avatar.webp")}
            class="rounded-full px-2.5 py-1.5 font-mono text-[9px] text-slate-500 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
          >
            {text().addAsset}
          </button>
          <button
            type="button"
            onClick={() => add("notes.html")}
            class="rounded-full px-2.5 py-1.5 font-mono text-[9px] text-slate-500 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
          >
            {text().addPage}
          </button>
          <button
            type="button"
            onClick={toggleCollision}
            aria-pressed={files().includes(conflictFile)}
            class={`rounded-full px-2.5 py-1.5 font-mono text-[9px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 ${
              files().includes(conflictFile)
                ? "bg-rose-200 text-slate-950"
                : "text-slate-500 hover:text-rose-200"
            }`}
          >
            {text().collide}
          </button>
          <button
            type="button"
            onClick={reset}
            class="ml-auto rounded-full px-2.5 py-1.5 font-mono text-[9px] text-slate-600 hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
          >
            {text().reset}
          </button>
        </div>

        <div class="mt-4 flex items-center gap-2 font-mono text-[9px]">
          <span class="text-emerald-200">dist/</span>
          <span class="text-slate-700">→</span>
          <span class="text-amber-200">route table</span>
          <span class="text-slate-700">→</span>
          <span class={buildPasses() ? "text-cyan-200" : "text-rose-200"}>
            {text().build} {buildPasses() ? text().passes : text().stopped}
          </span>
        </div>

        <Show
          when={buildPasses()}
          fallback={
            <div class="mt-5">
              <p class="font-mono text-[10px] text-rose-200">{text().duplicate}</p>
              <p class="mt-2 text-xs text-slate-500">{text().noBinary}</p>
            </div>
          }
        >
          <div class="mt-5 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            <For each={manifest()}>
              {(route) => (
                <button
                  type="button"
                  onClick={() => setSelectedRoute(route.routePath)}
                  aria-pressed={selectedRoute() === route.routePath}
                  class={`flex min-w-0 items-center justify-between gap-2 py-1 text-left font-mono text-[9px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 ${
                    selectedRoute() === route.routePath ? "text-emerald-200" : "text-slate-500"
                  }`}
                >
                  <span class="truncate">{route.routePath}</span>
                  <span class="truncate text-[8px] text-slate-700">{route.owners[0]}</span>
                </button>
              )}
            </For>
          </div>
        </Show>

        <output class="mt-4 block min-h-8 text-xs text-slate-400" aria-live="polite">
          <Show
            when={buildPasses() && activeRoute()}
            fallback={buildPasses() ? text().empty : text().noBinary}
          >
            {(route) => (
              <>
                {text().request} <code>{route().routePath}</code> · {text().served}{" "}
                {route().owners[0]} · {text().cache}:{" "}
                {cacheFor(route().routePath, route().owners[0])}
              </>
            )}
          </Show>
        </output>
      </div>
    </LabFrame>
  );
}
