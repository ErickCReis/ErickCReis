import { For, Show, createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type RuntimeVantageLabProps = { locale?: Locale };
type Scope = "process" | "cgroup" | "host" | "outside";
function getCopy(locale: Locale) {
  return {
    label: t(locale, "Runtime observer boundary lab"),
    position: t(locale, "observer position"),
    reading: t(locale, "reading"),
    cannotTell: t(locale, "cannot tell"),
    scopes: {
      process: t(locale, "process"),
      cgroup: t(locale, "cgroup"),
      host: t(locale, "host"),
      outside: t(locale, "outside"),
    },
    questions: {
      process: t(locale, "How much of Bun's allotted CPU is busy?"),
      cgroup: t(locale, "How close is the container to its memory limit?"),
      host: t(locale, "Can the container read the laptop battery?"),
      outside: t(locale, "Can a visitor reach the public route?"),
    },
    blind: {
      process: t(locale, "not total laptop CPU"),
      cgroup: t(locale, "not Bun heap or free host RAM"),
      host: t(locale, "only the hardware deliberately mounted"),
      outside: t(locale, "reachability, not the failing internal layer"),
    },
    cpu: t(locale, "CPU time"),
    allowance: t(locale, "allowance"),
    memory: t(locale, "memory charged"),
    limit: t(locale, "limit"),
    battery: t(locale, "power_supply mount"),
    route: t(locale, "public route"),
    visible: t(locale, "visible"),
    hidden: t(locale, "hidden"),
    reachable: t(locale, "reachable"),
    down: t(locale, "down"),
    processUp: t(locale, "Bun process: up 7d"),
  };
}

const scopes: Scope[] = ["process", "cgroup", "host", "outside"];
const tones: Record<Scope, string> = {
  process: "text-cyan-200",
  cgroup: "text-violet-200",
  host: "text-amber-200",
  outside: "text-emerald-200",
};

const markers: Record<Scope, string> = {
  process: "border-cyan-300 bg-cyan-300 shadow-cyan-300/30",
  cgroup: "border-violet-300 bg-violet-300 shadow-violet-300/30",
  host: "border-amber-300 bg-amber-300 shadow-amber-300/30",
  outside: "border-emerald-300 bg-emerald-300 shadow-emerald-300/30",
};

export function RuntimeVantageLab(props: RuntimeVantageLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const [scope, setScope] = createSignal<Scope>("process");
  const [cpuMs, setCpuMs] = createSignal(900);
  const [cpuCount, setCpuCount] = createSignal(1);
  const [memoryUsed, setMemoryUsed] = createSignal(640);
  const [memoryLimit, setMemoryLimit] = createSignal(1024);
  const [batteryMounted, setBatteryMounted] = createSignal(true);
  const [publicRoute, setPublicRoute] = createSignal(true);

  const cpuPercent = createMemo(() => Math.min(100, (cpuMs() / (1500 * cpuCount())) * 100));
  const memoryPercent = createMemo(() => Math.min(100, (memoryUsed() / memoryLimit()) * 100));
  const value = createMemo(() => {
    if (scope() === "process") return `${cpuPercent().toFixed(1)}%`;
    if (scope() === "cgroup") return `${memoryPercent().toFixed(1)}%`;
    if (scope() === "host") return batteryMounted() ? "64%" : "n/a";
    return publicRoute() ? text().reachable : text().down;
  });
  const evidence = createMemo(() => {
    if (scope() === "process") return `${cpuMs()}ms ÷ (1500ms × ${cpuCount()} vCPU)`;
    if (scope() === "cgroup") return `${memoryUsed()}MB ÷ ${memoryLimit()}MB`;
    if (scope() === "host") {
      return batteryMounted() ? "/host-sys/…/capacity → 64" : text().hidden;
    }
    return "DNS → tunnel → network → HTTP";
  });

  const selectedIndex = createMemo(() => scopes.indexOf(scope()));
  const selectClass = (choice: Scope) =>
    `group relative min-w-0 pt-4 text-left font-mono text-[9px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-200 motion-reduce:transition-none ${
      scope() === choice ? tones[choice] : "text-slate-600 hover:text-slate-300"
    }`;

  const controlClass = (choice: Scope) =>
    `rounded-sm px-1 py-0.5 font-mono text-[9px] ${tones[choice]} underline decoration-white/20 underline-offset-4 transition-colors hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current motion-reduce:transition-none`;

  return (
    <section
      class="not-prose my-10 mx-auto max-w-2xl"
      aria-label={text().label}
      data-concept-lab="runtime-vantage"
    >
      <div class="border-y border-white/10 py-5 sm:py-6">
        <div class="flex items-baseline justify-between gap-4">
          <p class="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
            {text().position}
          </p>
          <span class="font-mono text-[9px] tabular-nums text-slate-700" aria-hidden="true">
            0{selectedIndex() + 1} / 04
          </span>
        </div>

        <div class="mt-3 grid grid-cols-4" role="group" aria-label={text().position}>
          <For each={scopes}>
            {(choice, index) => (
              <button
                type="button"
                onClick={() => setScope(choice)}
                aria-pressed={scope() === choice}
                class={selectClass(choice)}
              >
                <span
                  aria-hidden="true"
                  class={`absolute left-0 top-0 h-px w-full ${index() <= selectedIndex() ? "bg-white/25" : "bg-white/10"}`}
                />
                <span
                  aria-hidden="true"
                  class={`absolute left-0 top-0 size-2 -translate-y-[calc(50%-0.5px)] rounded-full border transition-all motion-reduce:transition-none ${
                    scope() === choice
                      ? `${markers[choice]} shadow-[0_0_12px_currentColor]`
                      : index() < selectedIndex()
                        ? "border-slate-500 bg-slate-950"
                        : "border-slate-700 bg-slate-950"
                  }`}
                />
                <span class="block truncate pr-1">{text().scopes[choice]}</span>
              </button>
            )}
          </For>
        </div>

        <div class="mt-8 grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p class="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">
              {text().reading} · {text().scopes[scope()]}
            </p>
            <p class="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
              {text().questions[scope()]}
            </p>
          </div>
          <output
            class={`font-mono text-4xl leading-none tabular-nums sm:text-right ${tones[scope()]}`}
            aria-live="polite"
          >
            {value()}
          </output>
        </div>
        <code class="mt-3 block overflow-x-auto whitespace-nowrap font-mono text-[9px] text-slate-600">
          {evidence()}
        </code>

        <div class="mt-6 min-h-6 border-l border-white/10 pl-3">
          <Show when={scope() === "process"}>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label class="flex min-w-48 flex-1 items-center gap-3 font-mono text-[9px] text-slate-500">
                <span class="shrink-0">{text().cpu}</span>
                <input
                  type="range"
                  min="0"
                  max={1500 * cpuCount()}
                  step="100"
                  value={cpuMs()}
                  onInput={(event) => setCpuMs(event.currentTarget.valueAsNumber)}
                  class="min-w-20 flex-1 accent-cyan-300"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = cpuCount() === 4 ? 1 : cpuCount() + 1;
                  setCpuCount(next);
                  setCpuMs((value) => Math.min(value, 1500 * next));
                }}
                class={controlClass("process")}
              >
                {text().allowance}: {cpuCount()} vCPU
              </button>
            </div>
          </Show>

          <Show when={scope() === "cgroup"}>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label class="flex min-w-48 flex-1 items-center gap-3 font-mono text-[9px] text-slate-500">
                <span class="shrink-0">{text().memory}</span>
                <input
                  type="range"
                  min="0"
                  max={memoryLimit()}
                  step="64"
                  value={memoryUsed()}
                  onInput={(event) => setMemoryUsed(event.currentTarget.valueAsNumber)}
                  class="min-w-20 flex-1 accent-violet-300"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = memoryLimit() === 2048 ? 512 : memoryLimit() + 512;
                  setMemoryLimit(next);
                  setMemoryUsed((value) => Math.min(value, next));
                }}
                class={controlClass("cgroup")}
              >
                {text().limit}: {memoryLimit()}MB
              </button>
            </div>
          </Show>

          <Show when={scope() === "host"}>
            <button
              type="button"
              role="switch"
              aria-checked={batteryMounted()}
              onClick={() => setBatteryMounted((value) => !value)}
              class={controlClass("host")}
            >
              {text().battery}: {batteryMounted() ? text().visible : text().hidden}
            </button>
          </Show>

          <Show when={scope() === "outside"}>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <span class="font-mono text-[9px] text-slate-600">{text().processUp}</span>
              <button
                type="button"
                role="switch"
                aria-checked={publicRoute()}
                onClick={() => setPublicRoute((value) => !value)}
                class={controlClass("outside")}
              >
                {text().route}: {publicRoute() ? text().reachable : text().down}
              </button>
            </div>
          </Show>
        </div>

        <p class="mt-6 flex gap-2 text-[10px] leading-relaxed text-slate-500">
          <span class="shrink-0 font-mono uppercase tracking-wider text-slate-700">
            {text().cannotTell}
          </span>
          <span aria-hidden="true">→</span>
          <span>{text().blind[scope()]}</span>
        </p>
      </div>
    </section>
  );
}
