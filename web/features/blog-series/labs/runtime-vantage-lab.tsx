import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type RuntimeVantageLabProps = { locale?: LabLocale };
type Scope = "process" | "cgroup" | "host" | "outside";

const copy = {
  "en-US": {
    label: "Runtime observer lens",
    scopes: { process: "process", cgroup: "cgroup", host: "host", outside: "outside" },
    work: "CPU ms / 1.5 s",
    cpus: "vCPU",
    used: "memory used",
    limit: "limit",
    battery: "battery mount",
    public: "public route",
    mounted: "mounted",
    hidden: "hidden",
    reachable: "reachable",
    down: "down",
    processAge: "process 7d",
    units: { process: "CPU", cgroup: "memory", host: "battery", outside: "uptime" },
  },
  "pt-BR": {
    label: "Lente dos observadores do runtime",
    scopes: { process: "processo", cgroup: "cgroup", host: "host", outside: "externo" },
    work: "ms de CPU / 1,5 s",
    cpus: "vCPU",
    used: "memória usada",
    limit: "limite",
    battery: "montagem da bateria",
    public: "rota pública",
    mounted: "montada",
    hidden: "oculta",
    reachable: "acessível",
    down: "fora do ar",
    processAge: "processo 7d",
    units: { process: "CPU", cgroup: "memória", host: "bateria", outside: "uptime" },
  },
} as const;

const scopes: Scope[] = ["process", "cgroup", "host", "outside"];

export function RuntimeVantageLab(props: RuntimeVantageLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [scope, setScope] = createSignal<Scope>("process");
  const [cpuMs, setCpuMs] = createSignal(900);
  const [cpuCount, setCpuCount] = createSignal(1);
  const [memoryUsed, setMemoryUsed] = createSignal(640);
  const [memoryLimit, setMemoryLimit] = createSignal(1024);
  const [batteryMounted, setBatteryMounted] = createSignal(true);
  const [publicRoute, setPublicRoute] = createSignal(true);

  const cpuPercent = createMemo(() => Math.min(100, (cpuMs() / (1500 * cpuCount())) * 100));
  const memoryPercent = createMemo(() => (memoryUsed() / memoryLimit()) * 100);
  const gaugePercent = createMemo(() => {
    if (scope() === "process") return cpuPercent();
    if (scope() === "cgroup") return memoryPercent();
    if (scope() === "host") return batteryMounted() ? 64 : 0;
    return publicRoute() ? 100 : 0;
  });
  const gaugeValue = createMemo(() => {
    if (scope() === "process") return `${cpuPercent().toFixed(1)}%`;
    if (scope() === "cgroup") return `${memoryUsed()} / ${memoryLimit()} MB`;
    if (scope() === "host") return batteryMounted() ? "64%" : "n/a";
    return publicRoute() ? "36 h" : "DOWN";
  });
  const gaugeUnit = createMemo(() => {
    return text().units[scope()];
  });
  const gaugeColor = createMemo(() =>
    scope() === "outside" && !publicRoute() ? "#fb7185" : "#fbbf24",
  );

  return (
    <LabFrame id="runtime-vantage" label={text().label} class="mx-auto max-w-lg">
      <div class="rounded-[2.5rem] border border-amber-200/15 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.08),transparent_55%),#090a0c] p-4 shadow-2xl shadow-amber-950/20">
        <div class="relative grid grid-cols-4 gap-1 before:absolute before:top-1/2 before:right-5 before:left-5 before:h-px before:bg-amber-200/10">
          <For each={scopes}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setScope(choice)}
                aria-pressed={scope() === choice}
                class={`relative z-10 mx-auto grid size-12 place-items-center rounded-full border font-mono text-[8px] transition ${
                  scope() === choice
                    ? "border-amber-300 bg-amber-300 text-slate-950"
                    : "border-slate-700 bg-slate-950 text-slate-500"
                }`}
              >
                {text().scopes[choice]}
              </button>
            )}
          </For>
        </div>

        <div class="my-4 grid place-items-center">
          <div
            class="grid size-36 place-items-center rounded-full p-[7px] transition-all duration-300"
            style={`background:conic-gradient(${gaugeColor()} ${gaugePercent()}%,rgba(51,65,85,.35) 0)`}
          >
            <div class="grid size-full place-items-center rounded-full bg-[#090a0c] text-center">
              <output class="px-2 font-mono text-lg text-amber-100" aria-live="polite">
                {gaugeValue()}
                <span class="mt-1 block text-[9px] tracking-[0.18em] text-slate-600 uppercase">
                  {gaugeUnit()}
                </span>
              </output>
            </div>
          </div>
        </div>

        <div class="min-h-12 rounded-2xl bg-slate-950/55 px-3 py-2">
          <Show when={scope() === "process"}>
            <div class="grid grid-cols-[1fr_auto] items-center gap-3">
              <label class="font-mono text-[9px] text-slate-500">
                <span class="flex justify-between">
                  <span>{text().work}</span>
                  <output>{cpuMs()}</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="6000"
                  step="100"
                  value={cpuMs()}
                  onInput={(event) => setCpuMs(event.currentTarget.valueAsNumber)}
                  class="w-full accent-amber-400"
                />
              </label>
              <button
                type="button"
                onClick={() => setCpuCount((value) => (value === 4 ? 1 : value + 1))}
                class="rounded bg-amber-300/10 px-2 py-1 font-mono text-[9px] text-amber-200"
              >
                {cpuCount()} {text().cpus}
              </button>
            </div>
          </Show>

          <Show when={scope() === "cgroup"}>
            <div class="grid grid-cols-[1fr_auto] items-center gap-3">
              <label class="font-mono text-[9px] text-slate-500">
                <span class="flex justify-between">
                  <span>{text().used}</span>
                  <output>{memoryUsed()} MB</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max={memoryLimit()}
                  step="64"
                  value={memoryUsed()}
                  onInput={(event) => setMemoryUsed(event.currentTarget.valueAsNumber)}
                  class="w-full accent-amber-400"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = memoryLimit() === 2048 ? 512 : memoryLimit() + 512;
                  setMemoryLimit(next);
                  setMemoryUsed((value) => Math.min(value, next));
                }}
                class="rounded bg-amber-300/10 px-2 py-1 font-mono text-[9px] text-amber-200"
              >
                {text().limit} {memoryLimit()}
              </button>
            </div>
          </Show>

          <Show when={scope() === "host"}>
            <button
              type="button"
              onClick={() => setBatteryMounted((value) => !value)}
              class="flex w-full items-center justify-between font-mono text-[9px] text-slate-400"
            >
              <span>{text().battery}</span>
              <span class={batteryMounted() ? "text-amber-200" : "text-slate-600"}>
                {batteryMounted() ? text().mounted : text().hidden}
              </span>
            </button>
          </Show>

          <Show when={scope() === "outside"}>
            <button
              type="button"
              onClick={() => setPublicRoute((value) => !value)}
              class="flex w-full items-center justify-between font-mono text-[9px] text-slate-400"
            >
              <span>{text().public}</span>
              <span class={publicRoute() ? "text-emerald-200" : "text-rose-200"}>
                {publicRoute() ? text().reachable : text().down}
              </span>
              <span class="text-slate-700">{text().processAge}</span>
            </button>
          </Show>
        </div>
      </div>
    </LabFrame>
  );
}
