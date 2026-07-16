import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type StatsPipelineLabProps = { locale?: LabLocale };
type ModuleId = "system" | "users" | "spotify";
type ModuleState = { version: number; value: number };
type Packet = { id: ModuleId; tuple: string; skipped: number };
type Result =
  | { kind: "ready" }
  | { kind: "pending" }
  | { kind: "scan"; emitted: number; coalesced: number }
  | { kind: "fresh" };

const copy = {
  "en-US": {
    label: "Interactive version-gated SSE pipeline",
    eyebrow: "version gate · 500 ms",
    title: "Three clocks, one stream",
    instruction:
      "Change any source—several times if you like—then let the gate inspect their versions.",
    collectors: "independent collectors",
    modules: { system: "CPU sample", users: "visitor presence", spotify: "Spotify track" },
    values: { system: "CPU", users: "online", spotify: "track" },
    actions: { system: "sample CPU", users: "visitor joins", spotify: "next track" },
    version: "version",
    seen: "stream saw",
    source: "source",
    sources: "sources",
    pending: "waiting",
    inSync: "versions match",
    inspect: "inspect versions",
    gateNote: "one newest snapshot per changed module",
    stream: "named SSE events",
    awaiting: "Changes are waiting behind the gate.",
    empty: "Nothing to send — every version was already seen.",
    reconnect: "new SSE connection",
    ready: "Change a source to create a newer version.",
    change: "change",
    changes: "changes",
    wait: "wait behind the gate.",
    event: "event",
    events: "events",
    sent: { one: "emitted", many: "emitted" },
    coalesced: "intermediate changes coalesced into the newest snapshots",
    skipped: "older versions skipped",
    noChange: "Scan complete: no versions changed.",
    fresh: "Fresh connection emitted every current snapshot.",
  },
  "pt-BR": {
    label: "Pipeline SSE interativo com controle por versão",
    eyebrow: "controle de versões · 500 ms",
    title: "Três relógios, um fluxo",
    instruction:
      "Mude qualquer fonte — várias vezes, se quiser — e deixe o controle verificar suas versões.",
    collectors: "coletores independentes",
    modules: {
      system: "amostra de CPU",
      users: "visitantes presentes",
      spotify: "faixa do Spotify",
    },
    values: { system: "CPU", users: "online", spotify: "faixa" },
    actions: { system: "coletar CPU", users: "visitante entra", spotify: "próxima faixa" },
    version: "versão",
    seen: "fluxo viu",
    source: "fonte",
    sources: "fontes",
    pending: "aguardando",
    inSync: "versões iguais",
    inspect: "verificar versões",
    gateNote: "um único retrato atual por módulo alterado",
    stream: "eventos SSE nomeados",
    awaiting: "As mudanças estão aguardando atrás do controle.",
    empty: "Nada a enviar — todas as versões já foram vistas.",
    reconnect: "nova conexão SSE",
    ready: "Mude uma fonte para criar uma versão mais nova.",
    change: "mudança",
    changes: "mudanças",
    wait: "aguardam atrás do controle.",
    event: "evento",
    events: "eventos",
    sent: { one: "emitido", many: "emitidos" },
    coalesced: "mudanças intermediárias combinadas nos retratos mais novos",
    skipped: "versões anteriores ignoradas",
    noChange: "Verificação concluída: nenhuma versão mudou.",
    fresh: "A nova conexão emitiu todos os retratos atuais.",
  },
} as const;

const ids: ModuleId[] = ["system", "users", "spotify"];
const eventCode: Record<ModuleId, string> = { system: "sy", users: "ws", spotify: "sp" };
const moduleTheme: Record<ModuleId, { card: string; dot: string; action: string }> = {
  system: {
    card: "border-sky-300/20 bg-sky-300/[0.06] hover:border-sky-300/40",
    dot: "bg-sky-300 shadow-sky-300/50",
    action: "text-sky-200",
  },
  users: {
    card: "border-emerald-300/20 bg-emerald-300/[0.06] hover:border-emerald-300/40",
    dot: "bg-emerald-300 shadow-emerald-300/50",
    action: "text-emerald-200",
  },
  spotify: {
    card: "border-violet-300/20 bg-violet-300/[0.06] hover:border-violet-300/40",
    dot: "bg-violet-300 shadow-violet-300/50",
    action: "text-violet-200",
  },
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
  if (id === "spotify") return `[true,true,"track-${value}",…]`;
  return `[t,${value},…]`;
}

export function StatsPipelineLab(props: StatsPipelineLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [modules, setModules] = createSignal(initialModules());
  const [lastSeen, setLastSeen] = createSignal(initialVersions());
  const [packets, setPackets] = createSignal<Packet[]>([]);
  const [result, setResult] = createSignal<Result>({ kind: "ready" });

  const pending = createMemo(() => ids.filter((id) => modules()[id].version > lastSeen()[id]));
  const pendingChanges = createMemo(() =>
    pending().reduce((total, id) => total + modules()[id].version - lastSeen()[id], 0),
  );
  const delta = (id: ModuleId) => modules()[id].version - lastSeen()[id];
  const status = createMemo(() => {
    const current = result();
    if (current.kind === "ready") return text().ready;
    if (current.kind === "pending") {
      const count = pendingChanges();
      return `${count} ${count === 1 ? text().change : text().changes} ${text().wait}`;
    }
    if (current.kind === "fresh") return text().fresh;
    if (current.emitted === 0) return text().noChange;
    const noun = current.emitted === 1 ? text().event : text().events;
    const verb = current.emitted === 1 ? text().sent.one : text().sent.many;
    const detail = current.coalesced > 0 ? ` · ${current.coalesced} ${text().coalesced}.` : ".";
    return `${current.emitted} ${noun} ${verb}${detail}`;
  });

  function update(id: ModuleId) {
    setModules((current) => {
      const value = current[id].value;
      const nextValue =
        id === "system" ? (value >= 88 ? 12 : value + 7) : id === "users" ? value + 1 : value + 1;
      return {
        ...current,
        [id]: { version: current[id].version + 1, value: nextValue },
      };
    });
    setPackets([]);
    setResult({ kind: "pending" });
  }

  function packetFor(id: ModuleId, skipped = 0): Packet {
    return { id, tuple: wireTuple(id, modules()[id].value), skipped };
  }

  function scan() {
    const current = modules();
    const changed = pending();
    const nextPackets = changed.map((id) => packetFor(id, Math.max(0, delta(id) - 1)));
    const coalesced = nextPackets.reduce((total, packet) => total + packet.skipped, 0);

    setPackets(nextPackets);
    setLastSeen({
      system: current.system.version,
      users: current.users.version,
      spotify: current.spotify.version,
    });
    setResult({ kind: "scan", emitted: nextPackets.length, coalesced });
  }

  function reconnect() {
    const current = modules();
    setPackets(ids.map((id) => packetFor(id)));
    setLastSeen({
      system: current.system.version,
      users: current.users.version,
      spotify: current.spotify.version,
    });
    setResult({ kind: "fresh" });
  }

  return (
    <LabFrame id="stats-pipeline" label={text().label} class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-2xl border border-cyan-200/15 bg-[radial-gradient(circle_at_top,#12303a_0%,#071216_38%,#05090d_100%)] shadow-2xl shadow-cyan-950/25">
        <div class="border-b border-white/[0.06] px-4 py-4 sm:px-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-mono text-[9px] tracking-[0.2em] text-cyan-200/55 uppercase">
                {text().eyebrow}
              </p>
              <h3 class="mt-1 text-base font-medium tracking-tight text-slate-100">
                {text().title}
              </h3>
            </div>
            <output
              class={`rounded-full border px-2.5 py-1 font-mono text-[9px] ${
                pending().length > 0
                  ? "border-amber-300/25 bg-amber-300/10 text-amber-200"
                  : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200/75"
              }`}
              aria-live="polite"
            >
              {pending().length > 0
                ? `${pending().length} ${pending().length === 1 ? text().source : text().sources} · ${text().pending}`
                : text().inSync}
            </output>
          </div>
          <p
            id="stats-pipeline-instructions"
            class="mt-2 max-w-xl text-xs leading-relaxed text-slate-400"
          >
            {text().instruction}
          </p>
        </div>

        <div class="p-3 sm:p-4">
          <div class="mb-2 flex items-center gap-2 font-mono text-[8px] tracking-[0.16em] text-slate-600 uppercase">
            <span>{text().collectors}</span>
            <span class="h-px flex-1 bg-white/[0.06]" aria-hidden="true" />
          </div>

          <div class="grid gap-2 sm:grid-cols-3">
            <For each={ids}>
              {(id) => (
                <button
                  type="button"
                  onClick={() => update(id)}
                  aria-describedby="stats-pipeline-instructions"
                  aria-label={`${text().actions[id]}. ${text().version} ${modules()[id].version}; ${text().seen} ${lastSeen()[id]}.`}
                  class={`group relative min-h-28 overflow-hidden rounded-xl border p-3 text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-reduce:transform-none motion-reduce:transition-none ${moduleTheme[id].card}`}
                >
                  <span
                    class={`absolute top-3 right-3 size-1.5 rounded-full shadow-[0_0_10px] ${moduleTheme[id].dot}`}
                    aria-hidden="true"
                  />
                  <span class="block pr-4 font-mono text-[8px] tracking-wider text-slate-500 uppercase">
                    {text().modules[id]}
                  </span>
                  <span class="mt-2 flex items-baseline gap-1.5">
                    <span class="font-mono text-2xl text-slate-100 tabular-nums">
                      {displayValue(id, modules()[id].value)}
                    </span>
                    <span class="font-mono text-[8px] text-slate-600">{text().values[id]}</span>
                  </span>
                  <span class="mt-2 flex items-center justify-between gap-2 font-mono text-[8px]">
                    <span class="text-slate-600">
                      v{modules()[id].version} · {text().seen} v{lastSeen()[id]}
                    </span>
                    <span
                      class={`${moduleTheme[id].action} transition group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none`}
                    >
                      {text().actions[id]} →
                    </span>
                  </span>
                  <Show when={delta(id) > 0}>
                    <span class="absolute top-2 right-2 grid min-w-5 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-amber-300 px-1 py-0.5 font-mono text-[8px] font-bold text-slate-950 shadow-lg shadow-amber-950/40">
                      +{delta(id)}
                    </span>
                  </Show>
                </button>
              )}
            </For>
          </div>

          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-3" aria-hidden="true">
            <span class="h-px bg-gradient-to-r from-transparent to-cyan-300/25" />
            <span
              class={`size-1.5 rounded-full ${pending().length > 0 ? "animate-pulse bg-amber-300 motion-reduce:animate-none" : "bg-cyan-300/30"}`}
            />
            <span class="h-px bg-gradient-to-r from-cyan-300/25 to-transparent" />
          </div>

          <div class="flex flex-col items-stretch justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={scan}
              class="group flex min-h-12 items-center justify-center gap-3 rounded-xl border border-cyan-200/25 bg-cyan-200 px-4 text-left text-slate-950 shadow-lg shadow-cyan-950/25 transition hover:bg-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100 active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span class="grid size-7 place-items-center rounded-full border border-slate-950/15 font-mono text-[8px] font-bold">
                500
                <span class="sr-only">ms</span>
              </span>
              <span>
                <span class="block font-mono text-[10px] font-bold uppercase">
                  {text().inspect}
                </span>
                <span class="block text-[9px] text-slate-800/65">{text().gateNote}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={reconnect}
              class="min-h-12 rounded-xl border border-white/10 bg-white/[0.03] px-4 font-mono text-[9px] text-slate-400 transition hover:border-white/20 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-reduce:transition-none"
            >
              ↻ {text().reconnect}
            </button>
          </div>

          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-3" aria-hidden="true">
            <span class="h-px bg-gradient-to-r from-transparent to-cyan-300/25" />
            <span class="font-mono text-[8px] text-cyan-200/35">SSE</span>
            <span class="h-px bg-gradient-to-r from-cyan-300/25 to-transparent" />
          </div>

          <div class="rounded-xl border border-white/[0.07] bg-slate-950/65 p-3">
            <div class="flex items-center justify-between gap-2">
              <span class="font-mono text-[8px] tracking-[0.16em] text-slate-600 uppercase">
                {text().stream}
              </span>
              <span class="flex gap-1" aria-hidden="true">
                <span class="size-1 rounded-full bg-rose-300/45" />
                <span class="size-1 rounded-full bg-amber-300/45" />
                <span class="size-1 rounded-full bg-emerald-300/45" />
              </span>
            </div>
            <div class="mt-2 min-h-9">
              <Show
                when={packets().length > 0}
                fallback={
                  <p class="py-2 font-mono text-[9px] text-slate-700">
                    {pending().length > 0 ? text().awaiting : text().empty}
                  </p>
                }
              >
                <ul class="grid gap-1.5 sm:grid-cols-3" aria-label={text().stream}>
                  <For each={packets()}>
                    {(packet) => (
                      <li class="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.035] px-2.5 py-2 font-mono text-[9px] text-slate-400">
                        <span class="mr-1.5 rounded bg-cyan-300/10 px-1.5 py-0.5 font-bold text-cyan-200">
                          {eventCode[packet.id]}
                        </span>
                        <code class="break-all">{packet.tuple}</code>
                        <Show when={packet.skipped > 0}>
                          <span class="mt-1 block text-[8px] text-amber-200/65">
                            {packet.skipped}× {text().skipped}
                          </span>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
          </div>

          <p
            class="mt-2 min-h-4 text-center font-mono text-[9px] text-cyan-100/55"
            aria-live="polite"
          >
            {status()}
          </p>
        </div>
      </div>
    </LabFrame>
  );
}
