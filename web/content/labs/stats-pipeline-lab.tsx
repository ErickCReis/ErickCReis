import { For, Show, createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type StatsPipelineLabProps = { locale?: Locale };
type ModuleId = "system" | "users" | "spotify";
type ModuleState = { version: number; value: number };
type Packet = { id: ModuleId; tuple: string; skipped: number };
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
    current: t(locale, "current"),
    emitted: t(locale, "emitted"),
    eventStream: t(locale, "SSE stream"),
    mutateLabel: (module: string, action: string) =>
      t(locale, "{action} {module}").replace("{action}", action).replace("{module}", module),
    pipeline: [
      t(locale, "collectors"),
      t(locale, "version gate"),
      t(locale, "SSE"),
      t(locale, "stores"),
    ],
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
    fresh: t(locale, "Fresh connection replayed every current snapshot."),
  };
}

const ids: ModuleId[] = ["system", "users", "spotify"];
const colors: Record<ModuleId, string> = {
  system: "bg-sky-300",
  users: "bg-emerald-300",
  spotify: "bg-violet-300",
};
const packetColors: Record<ModuleId, string> = {
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
    <section
      class="not-prose my-10 mx-auto max-w-xl font-mono"
      aria-label={text().label}
      data-concept-lab="stats-pipeline"
    >
      <div class="border-y border-white/10 py-5">
        <div
          class="flex items-center gap-2 overflow-hidden text-[9px] tracking-[0.12em] text-slate-500 uppercase"
          aria-hidden="true"
        >
          <span>{text().pipeline[0]}</span>
          <span class="h-px min-w-3 flex-1 bg-white/10" />
          <span class={pending().length ? "text-amber-200" : "text-slate-400"}>
            {text().pipeline[1]}
          </span>
          <span class="h-px min-w-3 flex-1 bg-white/10" />
          <span>{text().pipeline[2]}</span>
          <span class="h-px min-w-3 flex-1 bg-white/10" />
          <span>{text().pipeline[3]}</span>
        </div>

        <div class="mt-5 divide-y divide-white/[0.06] border-y border-white/[0.06]">
          <For each={ids}>
            {(id) => (
              <button
                type="button"
                onClick={() => update(id)}
                aria-label={text().mutateLabel(text().modules[id], text().mutate[id])}
                class="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
              >
                <span class="flex min-w-0 items-center gap-3">
                  <span class={`size-1.5 shrink-0 rounded-full ${colors[id]}`} aria-hidden="true" />
                  <span class="min-w-0">
                    <span class="flex items-baseline gap-2">
                      <span class="truncate text-[11px] text-slate-200">{text().modules[id]}</span>
                      <span class="truncate text-[9px] text-slate-600 transition-colors group-hover:text-slate-400">
                        + {text().mutate[id]}
                      </span>
                    </span>
                    <span class="mt-1 flex items-center gap-1.5 text-[8px] text-slate-600">
                      <span>
                        {text().emitted} v{lastSeen()[id]}
                      </span>
                      <span aria-hidden="true">→</span>
                      <span class={modules()[id].version > lastSeen()[id] ? "text-amber-200" : ""}>
                        {text().current} v{modules()[id].version}
                      </span>
                    </span>
                  </span>
                </span>
                <span class="text-right text-sm tabular-nums text-slate-300">
                  {displayValue(id, modules()[id].value)}
                </span>
              </button>
            )}
          </For>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <span class="h-px flex-1 bg-white/10" aria-hidden="true" />
          <button
            type="button"
            onClick={scan}
            class="shrink-0 rounded-sm border border-amber-200/50 px-3 py-1.5 text-[9px] text-amber-100 transition-colors hover:bg-amber-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            {text().scan}
            <Show when={pendingChanges()}>
              <span class="ml-2 rounded-sm bg-amber-200 px-1 text-[8px] text-slate-950">
                {pendingChanges()}
              </span>
            </Show>
          </button>
          <span class="h-px flex-1 bg-white/10" aria-hidden="true" />
        </div>

        <div class="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <span class="pt-px text-[8px] tracking-[0.12em] text-slate-600 uppercase">
            {text().eventStream}
          </span>
          <Show
            when={packets().length > 0}
            fallback={<span class="text-[9px] text-slate-700">—</span>}
          >
            <ul class="space-y-1.5 text-[9px]">
              <For each={packets()}>
                {(packet) => (
                  <li class="flex min-w-0 items-center gap-2">
                    <span class={packetColors[packet.id]}>event:{packet.id}</span>
                    <code class="truncate text-slate-500">data: {packet.tuple}</code>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <div class="mt-5 flex items-end justify-between gap-4 border-t border-white/[0.06] pt-3">
          <output
            class="block max-w-sm text-[10px] leading-relaxed text-slate-400"
            aria-live="polite"
          >
            {message()}
          </output>
          <button
            type="button"
            onClick={reconnect}
            class="shrink-0 text-[9px] text-slate-600 underline decoration-white/10 underline-offset-4 transition-colors hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"
          >
            {text().reconnect}
          </button>
        </div>
      </div>
    </section>
  );
}
