import { For, Show, createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type StatsPipelineLabProps = { locale?: Locale };
type ModuleId = "system" | "users" | "spotify";
type ModuleState = { version: number; value: number };
type Packet = { id: ModuleId; version: number };

function getCopy(locale: Locale) {
  return {
    label: t(locale, "Interactive version-gated SSE pipeline"),
    modules: {
      system: t(locale, "CPU"),
      users: t(locale, "visitors"),
      spotify: t(locale, "Spotify"),
    },
    mutate: {
      system: t(locale, "sample"),
      users: t(locale, "join"),
      spotify: t(locale, "next track"),
    },
    scan: t(locale, "check versions"),
    reconnect: t(locale, "new connection"),
    mutateLabel: (module: string, action: string) =>
      t(locale, "{action} {module}").replace("{action}", action).replace("{module}", module),
    collectors: t(locale, "collectors"),
    gate: t(locale, "version gate"),
    stream: t(locale, "SSE stream"),
    ready: t(locale, "Change a source, then check its version."),
    pending: (count: number) =>
      (count === 1 ? t(locale, "1 change waiting") : t(locale, "{count} changes waiting")).replace(
        "{count}",
        String(count),
      ),
    empty: t(locale, "No newer versions to emit."),
    sent: (count: number, skipped: number) => {
      const emitted = (
        count === 1 ? t(locale, "1 event emitted") : t(locale, "{count} events emitted")
      ).replace("{count}", String(count));
      if (skipped === 0) return emitted;

      const skippedVersions = (
        skipped === 1
          ? t(locale, "1 intermediate version skipped")
          : t(locale, "{count} intermediate versions skipped")
      ).replace("{count}", String(skipped));
      return `${emitted} · ${skippedVersions}`;
    },
    fresh: t(locale, "Replayed all current snapshots."),
  };
}

const ids: ModuleId[] = ["system", "users", "spotify"];
const sourceStyles: Record<ModuleId, string> = {
  system: "hover:bg-cyan-400/10 focus-visible:outline-cyan-300",
  users: "hover:bg-lime-400/10 focus-visible:outline-lime-300",
  spotify: "hover:bg-fuchsia-400/10 focus-visible:outline-fuchsia-300",
};
const signalStyles: Record<ModuleId, string> = {
  system: "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.65)]",
  users: "bg-lime-300 shadow-[0_0_14px_rgba(190,242,100,0.65)]",
  spotify: "bg-fuchsia-300 shadow-[0_0_14px_rgba(240,171,252,0.65)]",
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

export function StatsPipelineLab(props: StatsPipelineLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
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
    return { id, version: modules()[id].version };
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
    const changed = pending();
    const skipped = changed.reduce(
      (total, id) => total + Math.max(0, modules()[id].version - lastSeen()[id] - 1),
      0,
    );
    setPackets(changed.map(packetFor));
    markSeen();
    setMessage(changed.length ? text().sent(changed.length, skipped) : text().empty);
  }

  function reconnect() {
    setPackets(ids.map(packetFor));
    markSeen();
    setMessage(text().fresh);
  }

  return (
    <section
      class="not-prose mx-auto my-10 max-w-2xl font-mono"
      aria-label={text().label}
      data-concept-lab="stats-pipeline"
    >
      <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] sm:items-stretch">
        <div class="rounded-2xl bg-slate-950/70 p-2 ring-1 ring-white/8">
          <p class="px-2 pt-1 pb-2 text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">
            {text().collectors}
          </p>
          <div class="space-y-1">
            <For each={ids}>
              {(id) => (
                <button
                  type="button"
                  onClick={() => update(id)}
                  aria-label={text().mutateLabel(text().modules[id], text().mutate[id])}
                  class={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 ${sourceStyles[id]}`}
                >
                  <span
                    class={`size-2 shrink-0 rounded-full ${signalStyles[id]}`}
                    aria-hidden="true"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-slate-100">
                      {text().modules[id]}
                    </span>
                    <span class="block truncate text-xs text-slate-500 group-hover:text-slate-300">
                      + {text().mutate[id]}
                    </span>
                  </span>
                  <span class="text-right">
                    <strong class="block text-base font-bold tabular-nums text-white">
                      {displayValue(id, modules()[id].value)}
                    </strong>
                    <span
                      class={`block text-xs font-bold tabular-nums ${
                        modules()[id].version > lastSeen()[id] ? "text-amber-300" : "text-slate-600"
                      }`}
                    >
                      v{modules()[id].version}
                    </span>
                  </span>
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="relative flex min-h-20 items-center justify-center overflow-hidden rounded-2xl bg-amber-300 px-3 py-4 text-slate-950">
          <div
            class="absolute inset-x-0 top-1/2 h-px bg-slate-950/15 sm:inset-y-0 sm:left-1/2 sm:h-auto sm:w-px"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={scan}
            class="relative z-10 flex min-w-24 flex-col items-center rounded-xl bg-slate-950 px-4 py-3 text-center text-amber-200 shadow-lg shadow-amber-950/20 transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
          >
            <span class="text-xs font-bold tracking-[0.12em] uppercase">{text().gate}</span>
            <span class="mt-1 text-sm font-bold">{text().scan}</span>
            <Show when={pendingChanges() > 0}>
              <span class="mt-1.5 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-black text-slate-950">
                {pendingChanges()}
              </span>
            </Show>
          </button>
        </div>

        <div class="flex min-h-32 flex-col rounded-2xl bg-slate-900/55 p-3 ring-1 ring-white/8">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-bold tracking-[0.16em] text-slate-500 uppercase">
              {text().stream}
            </p>
            <button
              type="button"
              onClick={reconnect}
              class="text-xs font-semibold text-slate-400 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
            >
              {text().reconnect}
            </button>
          </div>

          <div class="flex flex-1 items-center py-4">
            <Show
              when={packets().length > 0}
              fallback={<span class="mx-auto text-2xl font-black text-slate-700">∅</span>}
            >
              <ul class="w-full space-y-2">
                <For each={packets()}>
                  {(packet) => (
                    <li class="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
                      <span
                        class={`size-2 shrink-0 rounded-full ${signalStyles[packet.id]}`}
                        aria-hidden="true"
                      />
                      <span class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">
                        {text().modules[packet.id]}
                      </span>
                      <strong class="text-sm font-black tabular-nums text-white">
                        v{packet.version}
                      </strong>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </div>
      </div>

      <output class="mt-3 block text-center text-xs font-medium text-slate-400" aria-live="polite">
        {message()}
      </output>
    </section>
  );
}
