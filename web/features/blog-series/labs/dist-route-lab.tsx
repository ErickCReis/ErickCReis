import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type DistRouteLabProps = { locale?: LabLocale };

const copy = {
  "en-US": {
    label: "Static route compiler",
    placeholder: "assets/avatar.webp",
    add: "add",
    collide: "inject collision",
    reset: "reset",
    compiled: "compiled",
    failed: "duplicate route",
    remove: "remove",
    routes: "routes",
  },
  "pt-BR": {
    label: "Compilador de rotas estáticas",
    placeholder: "assets/avatar.webp",
    add: "adicionar",
    collide: "injetar colisão",
    reset: "reiniciar",
    compiled: "compilado",
    failed: "rota duplicada",
    remove: "remover",
    routes: "rotas",
  },
} as const;

const initialFiles = ["index.html", "content/index.html", "about.html", "_astro/app.A1B2.js"];

function routesFor(file: string) {
  const path = `/${file.replace(/^\/+/, "")}`;
  const routes = new Set([path]);
  if (path.endsWith("/index.html")) {
    const clean = path.slice(0, -"/index.html".length) || "/";
    routes.add(clean);
    if (clean !== "/") routes.add(`${clean}/`);
  } else if (path.endsWith(".html")) {
    routes.add(path.slice(0, -5) || "/");
  }
  return [...routes];
}

function cacheFor(file: string) {
  if (file.startsWith("_astro/")) return "immutable";
  if (file.endsWith(".html")) return "no-cache";
  return "1h";
}

export function DistRouteLab(props: DistRouteLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [files, setFiles] = createSignal([...initialFiles]);
  const [input, setInput] = createSignal("");
  const rows = createMemo(() =>
    files().map((file) => ({ file, routes: routesFor(file), cache: cacheFor(file) })),
  );
  const collisions = createMemo(() => {
    const owners = new Map<string, string[]>();
    for (const row of rows()) {
      for (const route of row.routes) owners.set(route, [...(owners.get(route) ?? []), row.file]);
    }
    return [...owners].filter(([, routeOwners]) => routeOwners.length > 1);
  });
  const routeCount = createMemo(() => new Set(rows().flatMap((row) => row.routes)).size);

  function addFile(value = input()) {
    const file = value.trim().replace(/^\.\//, "").replace(/^\/+/, "");
    if (!file) return;
    setFiles((current) => (current.includes(file) ? current : [...current, file]));
    setInput("");
  }

  return (
    <LabFrame id="dist-route-table" label={text().label} class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-xl border border-slate-200/15 bg-[#050807] font-mono shadow-2xl shadow-emerald-950/20">
        <form
          class="flex items-center gap-2 border-b border-emerald-200/10 bg-emerald-300/[0.04] px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            addFile();
          }}
        >
          <span class="text-emerald-300">$</span>
          <input
            value={input()}
            onInput={(event) => setInput(event.currentTarget.value)}
            placeholder={text().placeholder}
            aria-label={text().label}
            class="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-700"
          />
          <button type="submit" class="rounded bg-emerald-300 px-2 py-1 text-[9px] text-slate-950">
            {text().add}
          </button>
        </form>

        <div class="max-h-64 overflow-y-auto p-2">
          <For each={rows()}>
            {(row) => (
              <div class="group grid grid-cols-[minmax(7rem,0.8fr)_minmax(0,1.4fr)_auto] items-center gap-2 border-b border-slate-200/5 px-2 py-1.5 text-[9px] last:border-0">
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((file) => file !== row.file))}
                  aria-label={`${text().remove}: ${row.file}`}
                  class="truncate text-left text-slate-400 transition group-hover:text-rose-200"
                >
                  {row.file}
                </button>
                <span class="truncate text-cyan-200/75">{row.routes.join("  ·  ")}</span>
                <span
                  class={`rounded px-1.5 py-0.5 ${
                    row.cache === "immutable"
                      ? "bg-violet-300/10 text-violet-200"
                      : row.cache === "no-cache"
                        ? "bg-amber-300/10 text-amber-200"
                        : "bg-blue-300/10 text-blue-200"
                  }`}
                >
                  {row.cache}
                </span>
              </div>
            )}
          </For>
        </div>

        <Show when={collisions().length > 0}>
          <div
            class="border-t border-rose-300/15 bg-rose-400/[0.06] px-3 py-2 text-[9px] text-rose-200"
            aria-live="polite"
          >
            <For each={collisions()}>
              {([route, owners]) => (
                <p>
                  {route} ← {owners.join(" + ")}
                </p>
              )}
            </For>
          </div>
        </Show>

        <div class="flex items-center gap-2 border-t border-slate-200/10 px-3 py-2 text-[9px]">
          <span
            class={collisions().length ? "text-rose-300" : "text-emerald-300"}
            aria-live="polite"
          >
            {collisions().length ? "✕" : "✓"}{" "}
            {collisions().length ? text().failed : text().compiled}
          </span>
          <span class="text-slate-700">
            {routeCount()} {text().routes}
          </span>
          <button
            type="button"
            onClick={() => addFile("about/index.html")}
            class="ml-auto text-amber-200/60 hover:text-amber-200"
          >
            {text().collide}
          </button>
          <button
            type="button"
            onClick={() => setFiles([...initialFiles])}
            class="text-slate-600 hover:text-slate-300"
          >
            {text().reset}
          </button>
        </div>
      </div>
    </LabFrame>
  );
}
