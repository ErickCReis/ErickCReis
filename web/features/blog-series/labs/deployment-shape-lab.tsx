import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type DeploymentShapeLabProps = { locale?: LabLocale };
type Mode = "platform" | "single";
type Capability = "html" | "api" | "ws" | "db" | "cron";

const copy = {
  "en-US": {
    label: "Deployment boundary simulator",
    modes: { platform: "many runtimes", single: "one runtime" },
    capabilities: { html: "HTML", api: "API", ws: "WS", db: "DB", cron: "CRON" },
    platformOwners: { html: "edge", api: "worker", ws: "durable", db: "managed DB", cron: "job" },
    singleOwner: "Bun",
    boundary: "boundary",
    boundaries: "boundaries",
    empty: "select a need",
  },
  "pt-BR": {
    label: "Simulador de fronteiras do deploy",
    modes: { platform: "vários runtimes", single: "um runtime" },
    capabilities: { html: "HTML", api: "API", ws: "WS", db: "BD", cron: "CRON" },
    platformOwners: {
      html: "borda",
      api: "worker",
      ws: "durable",
      db: "BD gerenciado",
      cron: "tarefa",
    },
    singleOwner: "Bun",
    boundary: "fronteira",
    boundaries: "fronteiras",
    empty: "selecione uma necessidade",
  },
} as const;

const capabilityIds: Capability[] = ["html", "api", "ws", "db", "cron"];

export function DeploymentShapeLab(props: DeploymentShapeLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [mode, setMode] = createSignal<Mode>("single");
  const [enabled, setEnabled] = createSignal<Record<Capability, boolean>>({
    html: true,
    api: true,
    ws: true,
    db: true,
    cron: true,
  });

  const active = createMemo(() => capabilityIds.filter((id) => enabled()[id]));
  const owner = (id: Capability) =>
    mode() === "single" ? text().singleOwner : text().platformOwners[id];
  const ownerCount = createMemo(() => new Set(active().map(owner)).size);

  return (
    <LabFrame
      id="deployment-shape"
      label={text().label}
      class="mx-auto max-w-xl overflow-hidden rounded-[1.75rem] border border-emerald-200/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.13),transparent_42%),rgba(2,6,23,0.82)] p-3 shadow-xl shadow-slate-950/20 sm:p-4"
    >
      <div class="flex items-center justify-between gap-3">
        <div
          class="inline-flex rounded-full bg-slate-950/60 p-1"
          role="group"
          aria-label={text().label}
        >
          <For each={["platform", "single"] as const}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setMode(choice)}
                aria-pressed={mode() === choice}
                class={`rounded-full px-3 py-1.5 font-mono text-xxs transition ${
                  mode() === choice ? "bg-emerald-300 text-slate-950" : "text-slate-400"
                }`}
              >
                {text().modes[choice]}
              </button>
            )}
          </For>
        </div>
        <output class="font-mono text-xs text-emerald-200" aria-live="polite">
          {ownerCount()} {ownerCount() === 1 ? text().boundary : text().boundaries}
        </output>
      </div>

      <div class="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={text().label}>
        <For each={capabilityIds}>
          {(id) => (
            <button
              type="button"
              onClick={() => setEnabled((current) => ({ ...current, [id]: !current[id] }))}
              aria-pressed={enabled()[id]}
              class={`rounded-md border px-2 py-1 font-mono text-xxs transition ${
                enabled()[id]
                  ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
                  : "border-slate-200/5 text-slate-600"
              }`}
            >
              {text().capabilities[id]}
            </button>
          )}
        </For>
      </div>

      <div class="mt-3 min-h-24 rounded-2xl bg-slate-950/45 p-2.5">
        <Show
          when={active().length > 0}
          fallback={
            <p class="grid min-h-19 place-items-center font-mono text-xs text-slate-600">
              {text().empty}
            </p>
          }
        >
          <div class="space-y-1.5" aria-live="polite">
            <For each={active()}>
              {(id) => (
                <div class="grid grid-cols-[3.25rem_1fr_auto] items-center gap-2 font-mono text-xxs">
                  <span class="text-slate-300">{text().capabilities[id]}</span>
                  <span class="h-px bg-gradient-to-r from-emerald-300/65 to-emerald-300/10" />
                  <span
                    class={`min-w-20 rounded-md px-2 py-1 text-center transition-colors ${
                      mode() === "single"
                        ? "bg-emerald-300 text-slate-950"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {owner(id)}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </LabFrame>
  );
}
