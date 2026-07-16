import { createMemo, createSignal, For, Show } from "solid-js";
import { ConceptLab, LabCard, LabMetric } from "@web/features/blog-series/components/concept-lab";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type DistRouteLabProps = {
  locale?: LabLocale;
};

const copy = {
  "en-US": {
    eyebrow: "Interactive concept lab",
    title: "Build a static route table",
    description:
      "Add files as if Astro had written them to dist. The workbench generates clean aliases, assigns cache policy, and rejects routes claimed by two files.",
    files: "Generated dist files",
    inputLabel: "Relative file path",
    placeholder: "assets/avatar.webp",
    add: "Add file",
    collisionExample: "Add collision example",
    reset: "Reset",
    remove: "Remove",
    table: "Compiled route table",
    file: "File",
    routes: "Registered routes",
    cache: "Cache-Control",
    routeCount: "Unique routes",
    collisions: "Collisions",
    build: "Server build",
    succeeds: "succeeds",
    fails: "fails",
    empty: "Add at least one dist file.",
    collisionTitle: "Ambiguous aliases",
    collisionMessage: "The build must stop because these request paths have more than one owner:",
    clean:
      "Every request path has one owner. The generated table can be compiled into the Bun server.",
  },
  "pt-BR": {
    eyebrow: "Laboratório interativo",
    title: "Monte uma tabela de rotas estáticas",
    description:
      "Adicione arquivos como se o Astro os tivesse gravado em dist. A ferramenta gera aliases limpos, atribui a política de cache e rejeita rotas disputadas por dois arquivos.",
    files: "Arquivos gerados em dist",
    inputLabel: "Caminho relativo do arquivo",
    placeholder: "assets/avatar.webp",
    add: "Adicionar arquivo",
    collisionExample: "Adicionar exemplo de colisão",
    reset: "Restaurar",
    remove: "Remover",
    table: "Tabela de rotas compilada",
    file: "Arquivo",
    routes: "Rotas registradas",
    cache: "Cache-Control",
    routeCount: "Rotas únicas",
    collisions: "Colisões",
    build: "Build do servidor",
    succeeds: "prossegue",
    fails: "falha",
    empty: "Adicione pelo menos um arquivo de dist.",
    collisionTitle: "Aliases ambíguos",
    collisionMessage: "O build precisa parar porque estes caminhos têm mais de um responsável:",
    clean:
      "Cada caminho tem um único responsável. A tabela gerada pode ser compilada dentro do servidor Bun.",
  },
} as const;

const initialFiles = ["index.html", "content/index.html", "about.html", "_astro/app.A1B2.js"];

function toRouteCandidates(relativePath: string) {
  const routePath = `/${relativePath.replace(/^\/+/, "")}`;
  const routes = new Set([routePath]);

  if (routePath.endsWith("/index.html")) {
    const nestedIndexPath = routePath.slice(0, -"/index.html".length) || "/";
    routes.add(nestedIndexPath);
    if (nestedIndexPath !== "/") routes.add(`${nestedIndexPath}/`);
  } else if (routePath.endsWith(".html")) {
    routes.add(routePath.slice(0, -".html".length) || "/");
  }

  return [...routes];
}

function getCacheControl(file: string, routes: string[]) {
  if (routes.some((route) => route.startsWith("/_astro/"))) {
    return "public, max-age=31536000, immutable";
  }
  if (file.endsWith(".html")) return "no-cache";
  return "public, max-age=3600";
}

export function DistRouteLab(props: DistRouteLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [files, setFiles] = createSignal([...initialFiles]);
  const [nextFile, setNextFile] = createSignal("");

  const rows = createMemo(() =>
    files().map((file) => {
      const routes = toRouteCandidates(file);
      return { file, routes, cache: getCacheControl(file, routes) };
    }),
  );
  const routeOwners = createMemo(() => {
    const owners = new Map<string, string[]>();
    for (const row of rows()) {
      for (const route of row.routes) {
        const filesForRoute = owners.get(route) ?? [];
        filesForRoute.push(row.file);
        owners.set(route, filesForRoute);
      }
    }
    return owners;
  });
  const collisions = createMemo(() => [...routeOwners()].filter(([, owners]) => owners.length > 1));

  const addFile = (value = nextFile()) => {
    const normalized = value.trim().replace(/^\.\//, "").replace(/^\/+/, "");
    if (!normalized) return;
    setFiles((current) => (current.includes(normalized) ? current : [...current, normalized]));
    setNextFile("");
  };

  return (
    <ConceptLab
      id="dist-route-table"
      eyebrow={text().eyebrow}
      title={text().title}
      description={text().description}
    >
      <div class="space-y-4">
        <LabCard title={text().files} accent="blue">
          <div class="space-y-3">
            <form
              class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                addFile();
              }}
            >
              <label class="block">
                <span class="sr-only">{text().inputLabel}</span>
                <input
                  type="text"
                  value={nextFile()}
                  onInput={(event) => setNextFile(event.currentTarget.value)}
                  placeholder={text().placeholder}
                  class="w-full rounded-lg border border-slate-200/15 bg-slate-950/50 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-300/40"
                />
              </label>
              <button
                type="submit"
                class="rounded-lg border border-blue-300/35 bg-blue-300/10 px-3 py-2.5 text-sm text-blue-50 transition hover:bg-blue-300/15"
              >
                {text().add}
              </button>
            </form>

            <div class="flex flex-wrap gap-2">
              <For each={files()}>
                {(file) => (
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                    class="rounded-full border border-slate-200/10 bg-slate-950/35 px-2.5 py-1 font-mono text-xxs text-slate-300 transition hover:border-rose-300/30 hover:text-rose-100"
                    aria-label={`${text().remove}: ${file}`}
                  >
                    {file} ×
                  </button>
                )}
              </For>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addFile("about/index.html")}
                class="rounded-lg border border-amber-300/25 px-3 py-2 text-xs text-amber-100 transition hover:bg-amber-300/10"
              >
                {text().collisionExample}
              </button>
              <button
                type="button"
                onClick={() => setFiles([...initialFiles])}
                class="rounded-lg border border-slate-200/15 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-200/5"
              >
                {text().reset}
              </button>
            </div>
          </div>
        </LabCard>

        <div class="grid gap-2 sm:grid-cols-3">
          <LabMetric label={text().routeCount} value={routeOwners().size} />
          <LabMetric label={text().collisions} value={collisions().length} />
          <LabMetric
            label={text().build}
            value={collisions().length === 0 ? text().succeeds : text().fails}
          />
        </div>

        <LabCard title={text().table} accent="slate">
          <div class="space-y-2">
            <Show
              when={rows().length > 0}
              fallback={<p class="text-sm text-slate-400">{text().empty}</p>}
            >
              <For each={rows()}>
                {(row) => (
                  <div class="grid gap-2 rounded-lg border border-slate-200/10 bg-slate-950/40 p-3 text-xs lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div>
                      <p class="font-mono text-xxs text-slate-500 uppercase">{text().file}</p>
                      <p class="mt-1 break-all font-mono text-slate-200">{row.file}</p>
                    </div>
                    <div>
                      <p class="font-mono text-xxs text-slate-500 uppercase">{text().routes}</p>
                      <p class="mt-1 break-all font-mono text-blue-200">{row.routes.join(" · ")}</p>
                    </div>
                    <div>
                      <p class="font-mono text-xxs text-slate-500 uppercase">{text().cache}</p>
                      <p class="mt-1 break-all font-mono text-emerald-200">{row.cache}</p>
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </LabCard>

        <Show
          when={collisions().length > 0}
          fallback={
            <p class="rounded-lg border border-emerald-200/15 bg-emerald-300/5 px-3 py-2.5 text-sm leading-relaxed text-emerald-50/80">
              {text().clean}
            </p>
          }
        >
          <section class="rounded-lg border border-rose-300/20 bg-rose-300/5 px-3 py-2.5">
            <h3 class="text-sm font-medium text-rose-100">{text().collisionTitle}</h3>
            <p class="mt-1 text-xs leading-relaxed text-rose-100/70">{text().collisionMessage}</p>
            <ul class="mt-2 space-y-1 font-mono text-xs text-rose-100/85" aria-live="polite">
              <For each={collisions()}>
                {([route, owners]) => <li>{`${route} ← ${owners.join(" + ")}`}</li>}
              </For>
            </ul>
          </section>
        </Show>
      </div>
    </ConceptLab>
  );
}
