import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type RuntimeVantageLabProps = { locale?: LabLocale };
type Scope = "process" | "cgroup" | "host" | "outside";

const copy = {
  "en-US": {
    label: "Runtime observer boundary lab",
    scopes: { process: "process", cgroup: "cgroup", host: "host", outside: "outside" },
    questions: {
      process: "How much of Bun's allotted CPU is busy?",
      cgroup: "How close is the container to its memory limit?",
      host: "Can the container read the laptop battery?",
      outside: "Can a visitor reach the public route?",
    },
    blind: {
      process: "not total laptop CPU",
      cgroup: "not Bun heap or free host RAM",
      host: "only the hardware deliberately mounted",
      outside: "reachability, not the failing internal layer",
    },
    cpu: "CPU time",
    allowance: "allowance",
    memory: "memory charged",
    limit: "limit",
    battery: "power_supply mount",
    route: "public route",
    visible: "visible",
    hidden: "hidden",
    reachable: "reachable",
    down: "down",
    processUp: "Bun process: up 7d",
  },
  "pt-BR": {
    label: "Laboratório dos limites de observação do runtime",
    scopes: { process: "processo", cgroup: "cgroup", host: "host", outside: "externo" },
    questions: {
      process: "Quanto da CPU atribuída ao Bun está ocupada?",
      cgroup: "Quão perto o container está do limite de memória?",
      host: "O container consegue ler a bateria do notebook?",
      outside: "Um visitante alcança a rota pública?",
    },
    blind: {
      process: "não é a CPU total do notebook",
      cgroup: "não é o heap do Bun nem a RAM livre do host",
      host: "somente o hardware montado de propósito",
      outside: "acessibilidade, não qual camada interna falhou",
    },
    cpu: "tempo de CPU",
    allowance: "capacidade",
    memory: "memória contabilizada",
    limit: "limite",
    battery: "montagem power_supply",
    route: "rota pública",
    visible: "visível",
    hidden: "oculta",
    reachable: "acessível",
    down: "fora do ar",
    processUp: "Processo Bun: ativo há 7d",
  },
} as const;

const scopes: Scope[] = ["process", "cgroup", "host", "outside"];
const tones: Record<Scope, string> = {
  process: "text-cyan-200",
  cgroup: "text-violet-200",
  host: "text-amber-200",
  outside: "text-emerald-200",
};

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

  const selectClass = (choice: Scope) =>
    `rounded-full px-2.5 py-1.5 font-mono text-[9px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 motion-reduce:transition-none ${
      scope() === choice ? `bg-white/10 ${tones[choice]}` : "text-slate-500 hover:text-slate-200"
    }`;

  return (
    <LabFrame id="runtime-vantage" label={text().label} class="mx-auto max-w-xl">
      <div class="border-y border-white/10 py-4">
        <div class="flex flex-wrap gap-1" role="group" aria-label={text().label}>
          <For each={scopes}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setScope(choice)}
                aria-pressed={scope() === choice}
                class={selectClass(choice)}
              >
                {text().scopes[choice]}
              </button>
            )}
          </For>
        </div>

        <div class="mt-5 flex items-end justify-between gap-4">
          <p class="max-w-sm text-sm text-slate-300">{text().questions[scope()]}</p>
          <output class={`shrink-0 font-mono text-2xl ${tones[scope()]}`} aria-live="polite">
            {value()}
          </output>
        </div>
        <code class="mt-2 block truncate font-mono text-[9px] text-slate-600">{evidence()}</code>

        <div class="mt-5">
          <Show when={scope() === "process"}>
            <div class="flex items-center gap-3">
              <label class="flex min-w-0 flex-1 items-center gap-2 font-mono text-[9px] text-slate-500">
                <span>{text().cpu}</span>
                <input
                  type="range"
                  min="0"
                  max={1500 * cpuCount()}
                  step="100"
                  value={cpuMs()}
                  onInput={(event) => setCpuMs(event.currentTarget.valueAsNumber)}
                  class="min-w-16 flex-1 accent-cyan-300"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = cpuCount() === 4 ? 1 : cpuCount() + 1;
                  setCpuCount(next);
                  setCpuMs((value) => Math.min(value, 1500 * next));
                }}
                class="font-mono text-[9px] text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              >
                {text().allowance}: {cpuCount()} vCPU
              </button>
            </div>
          </Show>

          <Show when={scope() === "cgroup"}>
            <div class="flex items-center gap-3">
              <label class="flex min-w-0 flex-1 items-center gap-2 font-mono text-[9px] text-slate-500">
                <span>{text().memory}</span>
                <input
                  type="range"
                  min="0"
                  max={memoryLimit()}
                  step="64"
                  value={memoryUsed()}
                  onInput={(event) => setMemoryUsed(event.currentTarget.valueAsNumber)}
                  class="min-w-16 flex-1 accent-violet-300"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = memoryLimit() === 2048 ? 512 : memoryLimit() + 512;
                  setMemoryLimit(next);
                  setMemoryUsed((value) => Math.min(value, next));
                }}
                class="font-mono text-[9px] text-violet-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200"
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
              class="font-mono text-[9px] text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
            >
              {text().battery}: {batteryMounted() ? text().visible : text().hidden}
            </button>
          </Show>

          <Show when={scope() === "outside"}>
            <div class="flex items-center justify-between gap-3">
              <span class="font-mono text-[9px] text-slate-600">{text().processUp}</span>
              <button
                type="button"
                role="switch"
                aria-checked={publicRoute()}
                onClick={() => setPublicRoute((value) => !value)}
                class="font-mono text-[9px] text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
              >
                {text().route}: {publicRoute() ? text().reachable : text().down}
              </button>
            </div>
          </Show>
        </div>

        <p class="mt-4 text-[10px] text-slate-500">↳ {text().blind[scope()]}</p>
      </div>
    </LabFrame>
  );
}
