import { createMemo, createSignal, For, Show } from "solid-js";
import { ConceptLab, LabCard, LabMetric } from "@web/features/blog-series/components/concept-lab";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type ModuleId = "system" | "websocket" | "spotify";

type ModuleState = {
  version: number;
  timestamp: number;
  value: number;
};

type ModuleMap = Record<ModuleId, ModuleState>;

type StatsPipelineLabProps = {
  locale?: LabLocale;
};

const copy = {
  "en-US": {
    eyebrow: "Interactive concept lab",
    title: "Run one SSE delivery scan",
    description:
      "Update collectors at their own pace, then run the delivery loop. Multiple mutations of one module become one event containing its newest snapshot.",
    modules: "Independent stat modules",
    moduleNames: { system: "System CPU", websocket: "Connected users", spotify: "Track progress" },
    mutate: "Update",
    scan: "Run 500 ms scan",
    reset: "Open a fresh SSE response",
    pending: "Changed modules",
    emitted: "Events in last scan",
    versions: "Module versions",
    wire: "Serialized SSE events",
    noEvents: "Run the scan to deliver changed modules.",
    event: "event",
    data: "data",
    statusFresh:
      "A new response has an empty lastSeen map, so every module with version > 0 is pending.",
    statusIdle: "No version changed since the previous scan, so the server yields nothing.",
    statusDelivered:
      "Each changed module yielded once. Repeated updates before the scan were coalesced into its latest value.",
  },
  "pt-BR": {
    eyebrow: "Laboratório interativo",
    title: "Execute uma varredura de entrega SSE",
    description:
      "Atualize coletores no ritmo de cada um e execute o loop de entrega. Várias mutações de um módulo viram um evento com seu retrato mais novo.",
    modules: "Módulos independentes de estatísticas",
    moduleNames: {
      system: "CPU do sistema",
      websocket: "Usuários conectados",
      spotify: "Progresso da faixa",
    },
    mutate: "Atualizar",
    scan: "Executar varredura de 500 ms",
    reset: "Abrir uma nova resposta SSE",
    pending: "Módulos alterados",
    emitted: "Eventos na última varredura",
    versions: "Versões dos módulos",
    wire: "Eventos SSE serializados",
    noEvents: "Execute a varredura para entregar os módulos alterados.",
    event: "evento",
    data: "dados",
    statusFresh:
      "Uma nova resposta tem o mapa lastSeen vazio, então todo módulo com versão > 0 está pendente.",
    statusIdle:
      "Nenhuma versão mudou desde a varredura anterior, então o servidor não produz nada.",
    statusDelivered:
      "Cada módulo alterado produziu um evento. Atualizações repetidas antes da varredura foram combinadas no valor mais recente.",
  },
} as const;

const moduleIds: ModuleId[] = ["system", "websocket", "spotify"];
const eventCodes: Record<ModuleId, "sy" | "ws" | "sp"> = {
  system: "sy",
  websocket: "ws",
  spotify: "sp",
};

function createInitialModules(): ModuleMap {
  return {
    system: { version: 1, timestamp: 1_700_000_000_000, value: 18 },
    websocket: { version: 1, timestamp: 1_700_000_000_000, value: 2 },
    spotify: { version: 1, timestamp: 1_700_000_000_000, value: 42_000 },
  };
}

function serializeModule(id: ModuleId, state: ModuleState) {
  switch (id) {
    case "system":
      return [state.timestamp, state.value, 512, 1024, 1, 50, null, null];
    case "websocket":
      return [state.timestamp, state.value, Math.max(4, state.value), 1_699_999_900_000];
    case "spotify":
      return [
        true,
        true,
        "track-1",
        "Demo Track",
        ["Demo Artist"],
        "Demo Album",
        null,
        state.value,
        180_000,
        state.timestamp,
      ];
  }
}

export function StatsPipelineLab(props: StatsPipelineLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [modules, setModules] = createSignal<ModuleMap>(createInitialModules());
  const [lastSeen, setLastSeen] = createSignal<Record<ModuleId, number>>({
    system: 0,
    websocket: 0,
    spotify: 0,
  });
  const [events, setEvents] = createSignal<Array<{ code: string; data: unknown[] }>>([]);
  const [hasScanned, setHasScanned] = createSignal(false);

  const pendingIds = createMemo(() =>
    moduleIds.filter((id) => modules()[id].version > lastSeen()[id]),
  );

  const mutateModule = (id: ModuleId) => {
    setModules((current) => {
      const state = current[id];
      const increment = id === "spotify" ? 2_500 : 1;
      return {
        ...current,
        [id]: {
          version: state.version + 1,
          timestamp: state.timestamp + 500,
          value: state.value + increment,
        },
      };
    });
  };

  const scan = () => {
    const currentModules = modules();
    const changed = pendingIds();
    setEvents(
      changed.map((id) => ({
        code: eventCodes[id],
        data: serializeModule(id, currentModules[id]),
      })),
    );
    setLastSeen((current) => {
      const next = { ...current };
      for (const id of changed) next[id] = currentModules[id].version;
      return next;
    });
    setHasScanned(true);
  };

  const resetConnection = () => {
    setLastSeen({ system: 0, websocket: 0, spotify: 0 });
    setEvents([]);
    setHasScanned(false);
  };

  const status = createMemo(() => {
    if (!hasScanned()) return text().statusFresh;
    return events().length === 0 ? text().statusIdle : text().statusDelivered;
  });

  return (
    <ConceptLab
      id="stats-pipeline"
      eyebrow={text().eyebrow}
      title={text().title}
      description={text().description}
    >
      <div class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <LabCard title={text().modules} accent="blue">
            <div class="space-y-2">
              <For each={moduleIds}>
                {(id) => (
                  <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2">
                    <div>
                      <p class="text-sm text-slate-200">{text().moduleNames[id]}</p>
                      <p class="mt-0.5 font-mono text-xxs text-slate-500">
                        v{modules()[id].version} · value={modules()[id].value}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => mutateModule(id)}
                      class="rounded-md border border-blue-300/25 px-2.5 py-1.5 text-xs text-blue-100 transition hover:bg-blue-300/10"
                    >
                      {text().mutate}
                    </button>
                  </div>
                )}
              </For>
            </div>
          </LabCard>

          <LabCard title={text().versions} accent="emerald">
            <div class="space-y-3">
              <dl class="grid grid-cols-2 gap-2">
                <LabMetric label={text().pending} value={pendingIds().length} />
                <LabMetric label={text().emitted} value={events().length} />
              </dl>
              <div class="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={scan}
                  class="rounded-lg border border-emerald-300/35 bg-emerald-300/10 px-3 py-2.5 text-sm text-emerald-50 transition hover:bg-emerald-300/15"
                >
                  {text().scan}
                </button>
                <button
                  type="button"
                  onClick={resetConnection}
                  class="rounded-lg border border-slate-200/15 px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-200/5"
                >
                  {text().reset}
                </button>
              </div>
            </div>
          </LabCard>
        </div>

        <LabCard title={text().wire} accent="slate">
          <div class="space-y-2 font-mono text-xs" aria-live="polite">
            <Show
              when={events().length > 0}
              fallback={<p class="text-slate-400">{text().noEvents}</p>}
            >
              <For each={events()}>
                {(item) => (
                  <div class="overflow-x-auto rounded-lg bg-slate-950/60 px-3 py-2 text-slate-300">
                    <span class="text-emerald-200">{text().event}</span> {item.code}
                    <br />
                    <span class="text-blue-200">{text().data}</span> {JSON.stringify(item.data)}
                  </div>
                )}
              </For>
            </Show>
          </div>
        </LabCard>

        <p
          class="rounded-lg border border-amber-200/15 bg-amber-300/5 px-3 py-2.5 text-sm leading-relaxed text-amber-50/80"
          aria-live="polite"
        >
          {status()}
        </p>
      </div>
    </ConceptLab>
  );
}
