import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type StatsPipelineLabProps = { locale?: LabLocale };
type ModuleId = "system" | "users" | "spotify";
type ModuleState = { version: number; value: number };

const copy = {
  "en-US": {
    label: "SSE version conveyor",
    modules: { system: "CPU", users: "users", spotify: "track" },
    scan: "scan 500 ms",
    reset: "new SSE",
    empty: "no packets",
  },
  "pt-BR": {
    label: "Esteira de versões SSE",
    modules: { system: "CPU", users: "usuários", spotify: "faixa" },
    scan: "varrer 500 ms",
    reset: "novo SSE",
    empty: "sem pacotes",
  },
} as const;

const ids: ModuleId[] = ["system", "users", "spotify"];
const eventCode: Record<ModuleId, string> = { system: "sy", users: "ws", spotify: "sp" };
const nodeColor: Record<ModuleId, string> = {
  system: "border-blue-300/30 bg-blue-300/10 text-blue-100",
  users: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  spotify: "border-violet-300/30 bg-violet-300/10 text-violet-100",
};

function initialModules(): Record<ModuleId, ModuleState> {
  return {
    system: { version: 1, value: 18 },
    users: { version: 1, value: 2 },
    spotify: { version: 1, value: 42 },
  };
}

export function StatsPipelineLab(props: StatsPipelineLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [modules, setModules] = createSignal(initialModules());
  const [lastSeen, setLastSeen] = createSignal<Record<ModuleId, number>>({
    system: 0,
    users: 0,
    spotify: 0,
  });
  const [packets, setPackets] = createSignal<Array<{ id: ModuleId; tuple: string }>>([]);

  const pending = createMemo(() => ids.filter((id) => modules()[id].version > lastSeen()[id]));
  const delta = (id: ModuleId) => modules()[id].version - lastSeen()[id];

  function update(id: ModuleId) {
    setModules((current) => ({
      ...current,
      [id]: {
        version: current[id].version + 1,
        value: current[id].value + (id === "spotify" ? 3 : 1),
      },
    }));
  }

  function scan() {
    const current = modules();
    setPackets(
      pending().map((id) => ({
        id,
        tuple: id === "spotify" ? `[true,${current[id].value}]` : `[t,${current[id].value}]`,
      })),
    );
    setLastSeen({
      system: current.system.version,
      users: current.users.version,
      spotify: current.spotify.version,
    });
  }

  return (
    <LabFrame id="stats-pipeline" label={text().label} class="mx-auto max-w-xl">
      <div class="rounded-xl border border-cyan-200/15 bg-[#071014] p-3 shadow-xl shadow-cyan-950/20">
        <div class="grid grid-cols-3 gap-2">
          <For each={ids}>
            {(id) => (
              <button
                type="button"
                onClick={() => update(id)}
                aria-label={`${text().modules[id]} +1`}
                class={`relative rounded-lg border px-2 py-3 text-left transition active:translate-y-0.5 ${nodeColor[id]}`}
              >
                <span class="block font-mono text-[9px] uppercase opacity-60">
                  {text().modules[id]}
                </span>
                <span class="mt-1 block font-mono text-lg">{modules()[id].value}</span>
                <Show when={delta(id) > 0}>
                  <span class="absolute -top-1 -right-1 rounded-full bg-amber-300 px-1.5 py-0.5 font-mono text-[8px] text-slate-950">
                    +{delta(id)}
                  </span>
                </Show>
              </button>
            )}
          </For>
        </div>

        <div class="my-2 flex items-center gap-2" aria-hidden="true">
          <span class="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-300/30 to-cyan-300/50" />
          <span class="font-mono text-[9px] text-cyan-200/40">▼</span>
          <span class="h-px flex-1 bg-gradient-to-r from-cyan-300/50 via-cyan-300/30 to-transparent" />
        </div>

        <div class="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <button
            type="button"
            onClick={scan}
            class="rounded-full bg-cyan-300 px-3 py-2 font-mono text-[10px] font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            {text().scan}
          </button>

          <div
            class="flex min-h-9 items-center gap-1.5 overflow-x-auto rounded-lg bg-slate-950/70 px-2"
            aria-live="polite"
          >
            <Show
              when={packets().length > 0}
              fallback={<span class="font-mono text-[9px] text-slate-700">{text().empty}</span>}
            >
              <For each={packets()}>
                {(packet) => (
                  <code class="shrink-0 rounded bg-slate-800 px-2 py-1 font-mono text-[9px] text-slate-300">
                    <span class="text-cyan-200">{eventCode[packet.id]}</span> {packet.tuple}
                  </code>
                )}
              </For>
            </Show>
          </div>

          <button
            type="button"
            onClick={() => {
              setLastSeen({ system: 0, users: 0, spotify: 0 });
              setPackets([]);
            }}
            class="rounded-md border border-slate-200/10 px-2 py-2 font-mono text-[9px] text-slate-500"
          >
            {text().reset}
          </button>
        </div>
      </div>
    </LabFrame>
  );
}
