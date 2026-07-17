import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type StatsPipelineLabProps = { locale?: LabLocale };
type ModuleId = "system" | "users" | "spotify";
type ModuleState = { version: number; value: number };
type Packet = { id: ModuleId; tuple: string; skipped: number };

const copy = {
  "en-US": {
    label: "Interactive version-gated SSE pipeline",
    modules: { system: "CPU", users: "visitors", spotify: "Spotify" },
    mutate: { system: "sample", users: "join", spotify: "next track" },
    scan: "check versions",
    reconnect: "new connection",
    pipeline: ["collectors", "version gate", "SSE", "stores"],
    ready: "Change a source, then check its version.",
    pending: (count: number) => `${count} change${count === 1 ? "" : "s"} waiting`,
    empty: "No newer versions to emit.",
    sent: (count: number, skipped: number) =>
      `${count} event${count === 1 ? "" : "s"} emitted${skipped ? ` · ${skipped} intermediate version${skipped === 1 ? "" : "s"} skipped` : ""}`,
    fresh: "Fresh connection replayed every current snapshot.",
  },
  "pt-BR": {
    label: "Pipeline SSE interativo com controle por versão",
    modules: { system: "CPU", users: "visitantes", spotify: "Spotify" },
    mutate: { system: "coletar", users: "entrada", spotify: "próxima faixa" },
    scan: "verificar versões",
    reconnect: "nova conexão",
    pipeline: ["coletores", "controle", "SSE", "stores"],
    ready: "Mude uma fonte e depois verifique sua versão.",
    pending: (count: number) => `${count} mudança${count === 1 ? "" : "s"} aguardando`,
    empty: "Nenhuma versão nova para emitir.",
    sent: (count: number, skipped: number) =>
      `${count} evento${count === 1 ? "" : "s"} emitido${count === 1 ? "" : "s"}${skipped ? ` · ${skipped} versão${skipped === 1 ? "" : "ões"} intermediária${skipped === 1 ? "" : "s"} ignorada${skipped === 1 ? "" : "s"}` : ""}`,
    fresh: "A nova conexão repetiu todos os retratos atuais.",
  },
} as const;

const ids: ModuleId[] = ["system", "users", "spotify"];
const colors: Record<ModuleId, string> = {
  system: "text-sky-200",
  users: "text-emerald-200",
  spotify: "text-violet-200",
};

function initialModules(): Record<ModuleId, ModuleState> {
  return {
    system: { version: 1, value: 18 },
    users: { version: 1, value: 2 },
    spotify: { version: 1, value: 7 },
  };
}

function initialVersions(): Record<ModuleId, number> {
  return { system: 1, users: 1, spotify: 1 };
}

function displayValue(id: ModuleId, value: number) {
  if (id === "system") return `${value}%`;
  if (id === "spotify") return `#${String(value).padStart(2, "0")}`;
  return String(value);
}

function wireTuple(id: ModuleId, value: number) {
  if (id === "spotify") return `[true,"track-${value}",…]`;
  return `[t,${value},…]`;
}

export function StatsPipelineLab(props: StatsPipelineLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [modules, setModules] = createSignal(initialModules());
  const [lastSeen, setLastSeen] = createSignal(initialVersions());
  const [packets, setPackets] = createSignal<Packet[]>([]);
  const [message, setMessage] = createSignal<string>(text().ready);

  const pending = createMemo(() => ids.filter((id) => modules()[id].version > lastSeen()[id]));
  const pendingChanges = createMemo(() =>
    pending().reduce((total, id) => total + modules()[id].version - lastSeen()[id], 0),
  );

  function update(id: ModuleId) {
    setModules((current) => ({
      ...current,
      [id]: {
        version: current[id].version + 1,
        value:
          id === "system"
            ? current[id].value >= 88
              ? 12
              : current[id].value + 7
            : current[id].value + 1,
      },
    }));
    setPackets([]);
    setMessage(text().pending(pendingChanges()));
  }

  function packetFor(id: ModuleId): Packet {
    return {
      id,
      tuple: wireTuple(id, modules()[id].value),
      skipped: Math.max(0, modules()[id].version - lastSeen()[id] - 1),
    };
  }

  function markSeen() {
    const current = modules();
    setLastSeen({
      system: current.system.version,
      users: current.users.version,
      spotify: current.spotify.version,
    });
  }

  function scan() {
    const next = pending().map(packetFor);
    const skipped = next.reduce((total, packet) => total + packet.skipped, 0);
    setPackets(next);
    markSeen();
    setMessage(next.length ? text().sent(next.length, skipped) : text().empty);
  }

  function reconnect() {
    setPackets(ids.map(packetFor));
    markSeen();
    setMessage(text().fresh);
  }

  return (
    <LabFrame id="stats-pipeline" label={text().label} class="mx-auto max-w-xl">
      <div class="border-y border-white/10 py-4">
        <div class="grid grid-cols-3 gap-2">
          <For each={ids}>
            {(id) => (
              <button
                type="button"
                onClick={() => update(id)}
                class="min-w-0 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              >
                <span class={`block truncate font-mono text-[9px] ${colors[id]}`}>
                  {text().modules[id]}
                </span>
                <span class="mt-1 block font-mono text-sm text-slate-300">
                  {displayValue(id, modules()[id].value)}
                </span>
                <span class="block font-mono text-[8px] text-slate-600">
                  v{modules()[id].version} · {text().mutate[id]}
                </span>
              </button>
            )}
          </For>
        </div>

        <div
          class="mt-4 flex items-center gap-2 overflow-hidden font-mono text-[8px] text-slate-600"
          aria-hidden="true"
        >
          <For each={text().pipeline}>
            {(step, index) => (
              <>
                <span class={index() === 1 && pending().length ? "text-amber-200" : ""}>
                  {step}
                </span>
                <Show when={index() < text().pipeline.length - 1}>
                  <span>→</span>
                </Show>
              </>
            )}
          </For>
        </div>

        <div class="mt-4 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={scan}
            class="rounded-full bg-cyan-200 px-3 py-1.5 font-mono text-[9px] text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100"
          >
            {text().scan}
            {pendingChanges() ? ` · ${pendingChanges()}` : ""}
          </button>
          <button
            type="button"
            onClick={reconnect}
            class="rounded-full px-3 py-1.5 font-mono text-[9px] text-slate-500 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
          >
            {text().reconnect}
          </button>
        </div>

        <Show when={packets().length > 0}>
          <ul class="mt-4 space-y-1 font-mono text-[9px]">
            <For each={packets()}>
              {(packet) => (
                <li class="flex items-center gap-2">
                  <span class={colors[packet.id]}>event:{packet.id}</span>
                  <code class="truncate text-slate-500">data:{packet.tuple}</code>
                </li>
              )}
            </For>
          </ul>
        </Show>

        <output class="mt-4 block text-xs text-slate-400" aria-live="polite">
          {message()}
        </output>
      </div>
    </LabFrame>
  );
}
