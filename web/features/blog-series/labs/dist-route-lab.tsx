import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type DistRouteLabProps = { locale?: LabLocale };

const copy = {
  "en-US": {
    label: "Build-time static route compiler",
    eyebrow: "Compile-time contract",
    title: "Turn Astro's files into Elysia routes",
    intro:
      "Change the generated files. The macro derives clean aliases, rejects ambiguity, and gives each successful request a cache policy.",
    astro: "Astro build",
    scan: "Bun macro",
    binary: "Elysia binary",
    writesFiles: "writes files",
    ownsRoutes: "claims routes",
    servesBytes: "serves bytes",
    distFiles: "dist/ files",
    routeTable: "compiled route table",
    placeholder: "assets/avatar.webp",
    inputLabel: "Generated file path",
    add: "Add file",
    remove: "Remove",
    collide: "Add conflicting file",
    reset: "Reset",
    compiled: "build passes",
    failed: "build stopped",
    files: "files",
    routes: "unique routes",
    duplicate: "Duplicate owner",
    duplicateHelp: "Every request path must have exactly one owner before a binary is emitted.",
    tableHint: "Choose a route to send a request through the compiled table.",
    request: "Request probe",
    servedFrom: "served from",
    noBinary: "No binary emitted",
    resolveFirst: "Resolve the duplicate alias, then the request can reach a file.",
    empty: "Add a file to generate the first route.",
    cache: {
      immutable: "1 year · immutable",
      html: "revalidate",
      public: "1 hour",
    },
  },
  "pt-BR": {
    label: "Compilador de rotas estáticas em tempo de build",
    eyebrow: "Contrato de compilação",
    title: "Transforme os arquivos do Astro em rotas do Elysia",
    intro:
      "Altere os arquivos gerados. A macro deriva aliases limpos, rejeita ambiguidades e atribui uma política de cache a cada requisição válida.",
    astro: "Build do Astro",
    scan: "Macro do Bun",
    binary: "Binário Elysia",
    writesFiles: "grava arquivos",
    ownsRoutes: "assume rotas",
    servesBytes: "serve bytes",
    distFiles: "arquivos em dist/",
    routeTable: "tabela de rotas compilada",
    placeholder: "assets/avatar.webp",
    inputLabel: "Caminho do arquivo gerado",
    add: "Adicionar",
    remove: "Remover",
    collide: "Adicionar conflito",
    reset: "Reiniciar",
    compiled: "build aprovado",
    failed: "build interrompido",
    files: "arquivos",
    routes: "rotas únicas",
    duplicate: "Proprietário duplicado",
    duplicateHelp:
      "Cada caminho de requisição precisa ter exatamente um proprietário antes de o binário ser emitido.",
    tableHint: "Escolha uma rota para enviar uma requisição pela tabela compilada.",
    request: "Teste de requisição",
    servedFrom: "servido por",
    noBinary: "Nenhum binário emitido",
    resolveFirst: "Resolva o alias duplicado para que a requisição possa alcançar um arquivo.",
    empty: "Adicione um arquivo para gerar a primeira rota.",
    cache: {
      immutable: "1 ano · imutável",
      html: "revalidar",
      public: "1 hora",
    },
  },
} as const;

const initialFiles = ["index.html", "content/index.html", "about.html", "_astro/app.A1B2.js"];

function routesFor(file: string) {
  const routePath = `/${file.replace(/^\/+/, "")}`;
  const routes = new Set([routePath]);

  if (routePath.endsWith("/index.html")) {
    const cleanPath = routePath.slice(0, -"/index.html".length) || "/";
    routes.add(cleanPath);
    if (cleanPath !== "/") routes.add(`${cleanPath}/`);
  } else if (routePath.endsWith(".html")) {
    routes.add(routePath.slice(0, -".html".length) || "/");
  }

  return [...routes];
}

function cacheFor(routePath: string, filePath: string) {
  if (routePath.startsWith("/_astro/")) {
    return {
      key: "immutable" as const,
      header: "public, max-age=31536000, immutable",
      class: "border-violet-300/20 bg-violet-300/10 text-violet-200",
    };
  }

  if (filePath.endsWith(".html")) {
    return {
      key: "html" as const,
      header: "no-cache",
      class: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    };
  }

  return {
    key: "public" as const,
    header: "public, max-age=3600",
    class: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  };
}

function normalizeFile(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

export function DistRouteLab(props: DistRouteLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [files, setFiles] = createSignal([...initialFiles]);
  const [input, setInput] = createSignal("");
  const [selectedRoute, setSelectedRoute] = createSignal("/content/");

  const manifest = createMemo(() => {
    const owners = new Map<string, string[]>();

    for (const file of files()) {
      for (const route of routesFor(file)) {
        owners.set(route, [...(owners.get(route) ?? []), file]);
      }
    }

    return [...owners]
      .map(([routePath, routeOwners]) => ({
        routePath,
        owners: routeOwners,
        cache: cacheFor(routePath, routeOwners[0]),
      }))
      .sort((left, right) => left.routePath.localeCompare(right.routePath));
  });
  const collisions = createMemo(() => manifest().filter((route) => route.owners.length > 1));
  const buildPasses = createMemo(() => collisions().length === 0);
  const activeRoute = createMemo(
    () => manifest().find((route) => route.routePath === selectedRoute()) ?? manifest()[0],
  );

  function addFile(value = input()) {
    const file = normalizeFile(value);
    if (!file) return;
    setFiles((current) => (current.includes(file) ? current : [...current, file]));
    setInput("");
  }

  function removeFile(file: string) {
    setFiles((current) => current.filter((candidate) => candidate !== file));
  }

  function reset() {
    setFiles([...initialFiles]);
    setInput("");
    setSelectedRoute("/content/");
  }

  return (
    <LabFrame id="dist-route-table" label={text().label} class="mx-auto max-w-3xl">
      <div class="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_8%_0%,rgba(52,211,153,0.09),transparent_30%),radial-gradient(circle_at_95%_100%,rgba(34,211,238,0.06),transparent_34%),#070a0a] shadow-2xl shadow-emerald-950/20">
        <header class="border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <p class="font-mono text-[9px] tracking-[0.2em] text-emerald-300/60 uppercase">
            {text().eyebrow}
          </p>
          <h3 class="mt-1 text-base font-medium tracking-tight text-slate-100">{text().title}</h3>
          <p id="dist-route-instructions" class="mt-1.5 max-w-2xl text-xs text-slate-400">
            {text().intro}
          </p>

          <div
            class="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1"
            aria-label={`${text().astro}, ${text().scan}, ${text().binary}`}
          >
            <div class="min-w-0 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] px-2 py-2">
              <span class="block truncate font-mono text-[9px] text-emerald-200">
                {text().astro}
              </span>
              <span class="mt-0.5 block truncate text-[8px] text-slate-600">
                {text().writesFiles}
              </span>
            </div>
            <span class="font-mono text-[10px] text-slate-700" aria-hidden="true">
              →
            </span>
            <div class="min-w-0 rounded-lg border border-amber-300/15 bg-amber-300/[0.05] px-2 py-2">
              <span class="block truncate font-mono text-[9px] text-amber-200">{text().scan}</span>
              <span class="mt-0.5 block truncate text-[8px] text-slate-600">
                {text().ownsRoutes}
              </span>
            </div>
            <span class="font-mono text-[10px] text-slate-700" aria-hidden="true">
              →
            </span>
            <div class="min-w-0 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-2 py-2">
              <span class="block truncate font-mono text-[9px] text-cyan-200">{text().binary}</span>
              <span class="mt-0.5 block truncate text-[8px] text-slate-600">
                {text().servesBytes}
              </span>
            </div>
          </div>
        </header>

        <div class="grid min-h-0 sm:grid-cols-[0.82fr_1.18fr]">
          <section class="border-b border-white/[0.07] p-3 sm:border-r sm:border-b-0 sm:p-4">
            <div class="flex items-center justify-between gap-2">
              <h4 class="font-mono text-[9px] tracking-[0.16em] text-slate-500 uppercase">
                {text().distFiles}
              </h4>
              <span class="rounded-full bg-white/[0.04] px-2 py-0.5 font-mono text-[8px] text-slate-600">
                {files().length} {text().files}
              </span>
            </div>

            <form
              class="mt-3 flex gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                addFile();
              }}
            >
              <label for="dist-route-file" class="sr-only">
                {text().inputLabel}
              </label>
              <input
                id="dist-route-file"
                value={input()}
                onInput={(event) => setInput(event.currentTarget.value)}
                placeholder={text().placeholder}
                spellcheck={false}
                class="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/20 px-2.5 py-2 font-mono text-[10px] text-slate-200 outline-none placeholder:text-slate-700 focus:border-emerald-300/40 focus-visible:ring-2 focus-visible:ring-emerald-300/20"
              />
              <button
                type="submit"
                class="rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-2.5 py-2 font-mono text-[9px] text-emerald-100 transition-colors hover:bg-emerald-300/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 motion-reduce:transition-none"
              >
                {text().add}
              </button>
            </form>

            <div class="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1 sm:max-h-64">
              <For each={files()}>
                {(file) => (
                  <div class="group flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.025] px-2.5 py-2">
                    <span
                      class="size-1.5 shrink-0 rounded-sm bg-emerald-300/55"
                      aria-hidden="true"
                    />
                    <code class="min-w-0 flex-1 truncate text-[9px] text-slate-400">{file}</code>
                    <button
                      type="button"
                      onClick={() => removeFile(file)}
                      aria-label={`${text().remove}: ${file}`}
                      class="rounded px-1 font-mono text-xs text-slate-700 transition-colors hover:bg-rose-300/10 hover:text-rose-200 focus-visible:outline-2 focus-visible:outline-rose-200 motion-reduce:transition-none"
                    >
                      ×
                    </button>
                  </div>
                )}
              </For>
            </div>

            <div class="mt-3 flex flex-wrap gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3">
              <button
                type="button"
                onClick={() => addFile("about/index.html")}
                class="font-mono text-[9px] text-amber-200/65 underline decoration-amber-200/20 underline-offset-4 transition-colors hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 motion-reduce:transition-none"
              >
                + {text().collide}
              </button>
              <button
                type="button"
                onClick={reset}
                class="font-mono text-[9px] text-slate-600 underline decoration-slate-600/30 underline-offset-4 transition-colors hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 motion-reduce:transition-none"
              >
                {text().reset}
              </button>
            </div>
          </section>

          <section class="min-w-0 p-3 sm:p-4" aria-describedby="dist-route-instructions">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4 class="font-mono text-[9px] tracking-[0.16em] text-slate-500 uppercase">
                {text().routeTable}
              </h4>
              <span
                class={`rounded-full border px-2 py-0.5 font-mono text-[8px] ${
                  buildPasses()
                    ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                    : "border-rose-300/20 bg-rose-300/10 text-rose-200"
                }`}
              >
                {buildPasses() ? "✓" : "×"} {buildPasses() ? text().compiled : text().failed}
              </span>
            </div>
            <p class="mt-1 text-[9px] text-slate-600">
              {manifest().length} {text().routes} · {text().tableHint}
            </p>

            <div class="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1" aria-live="polite">
              <Show
                when={manifest().length > 0}
                fallback={<p class="py-8 text-center text-xs text-slate-600">{text().empty}</p>}
              >
                <For each={manifest()}>
                  {(route) => (
                    <button
                      type="button"
                      onClick={() => setSelectedRoute(route.routePath)}
                      aria-pressed={activeRoute()?.routePath === route.routePath}
                      class={`grid w-full min-w-0 grid-cols-[minmax(5.5rem,0.8fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-200 motion-reduce:transition-none ${
                        route.owners.length > 1
                          ? "border-rose-300/25 bg-rose-300/[0.07]"
                          : activeRoute()?.routePath === route.routePath
                            ? "border-cyan-300/25 bg-cyan-300/[0.07]"
                            : "border-white/[0.05] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                      }`}
                    >
                      <code
                        class={`truncate text-[9px] ${route.owners.length > 1 ? "text-rose-200" : "text-cyan-100"}`}
                      >
                        {route.routePath}
                      </code>
                      <span class="truncate text-[8px] text-slate-600">
                        {route.owners.join(" + ")}
                      </span>
                      <span
                        class={`hidden rounded border px-1.5 py-0.5 font-mono text-[7px] sm:inline ${route.cache.class}`}
                      >
                        {text().cache[route.cache.key]}
                      </span>
                    </button>
                  )}
                </For>
              </Show>
            </div>
          </section>
        </div>

        <Show when={collisions().length > 0}>
          <div role="alert" class="border-t border-rose-300/15 bg-rose-400/[0.06] px-4 py-3">
            <For each={collisions()}>
              {(collision) => (
                <p class="font-mono text-[9px] text-rose-200">
                  {text().duplicate}: <strong>{collision.routePath}</strong> ←{" "}
                  {collision.owners.join(" + ")}
                </p>
              )}
            </For>
            <p class="mt-1 text-[9px] text-rose-200/55">{text().duplicateHelp}</p>
          </div>
        </Show>

        <div class="border-t border-white/[0.07] bg-black/20 px-4 py-3 sm:px-5">
          <p class="font-mono text-[8px] tracking-[0.16em] text-slate-600 uppercase">
            {text().request}
          </p>
          <output class="mt-2 block min-w-0" aria-live="polite">
            <Show
              when={activeRoute()}
              fallback={<span class="font-mono text-[10px] text-slate-600">—</span>}
            >
              {(route) => (
                <Show
                  when={buildPasses()}
                  fallback={
                    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <code class="text-[10px] text-rose-200">× {text().noBinary}</code>
                      <span class="text-[9px] text-slate-600">{text().resolveFirst}</span>
                    </div>
                  }
                >
                  <div class="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(7rem,0.7fr)_minmax(0,1fr)] sm:gap-4">
                    <p class="min-w-0 truncate font-mono text-[10px] text-emerald-200">
                      <span class="text-emerald-300/50">GET</span> {route().routePath}{" "}
                      <span class="text-emerald-300">→ 200</span>
                    </p>
                    <div class="min-w-0 font-mono text-[9px] text-slate-500">
                      <p class="truncate">
                        {text().servedFrom} <span class="text-slate-300">{route().owners[0]}</span>
                      </p>
                      <p class="mt-0.5 truncate">
                        Cache-Control: <span class="text-cyan-200/75">{route().cache.header}</span>
                      </p>
                    </div>
                  </div>
                </Show>
              )}
            </Show>
          </output>
        </div>
      </div>
    </LabFrame>
  );
}
