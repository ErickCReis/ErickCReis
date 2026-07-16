import { For, Show, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type RuntimeVantageLabProps = { locale?: LabLocale };
type Scope = "process" | "cgroup" | "host" | "outside";

const copy = {
  "en-US": {
    label: "Runtime observer boundary lab",
    eyebrow: "Boundary lab",
    title: "One deployment, four honest answers",
    intro:
      "Pick an observer, then change the signal it can actually see. Every lens answers a different question.",
    selected: "selected lens",
    asks: "This lens asks",
    calculation: "evidence",
    cannotTell: "Cannot tell you",
    map: "Deployment cross-section",
    scopes: {
      process: { label: "Process", origin: "Bun" },
      cgroup: { label: "Cgroup", origin: "container" },
      host: { label: "Host", origin: "laptop" },
      outside: { label: "Outside", origin: "public probe" },
    },
    questions: {
      process: "How much of Bun's allotted CPU is busy?",
      cgroup: "How close is the container to its memory ceiling?",
      host: "Can the deploy read the laptop battery?",
      outside: "Can a visitor reach the complete public route?",
    },
    blindSpots: {
      process: "how busy every other process on the laptop is",
      cgroup: "how much RAM is still free outside the container",
      host: "anything on the host that was not deliberately mounted",
      outside: "which internal layer failed when the route is down",
    },
    units: {
      process: "of allotted CPU",
      cgroup: "of memory limit",
      host: "battery",
      outside: "public route",
    },
    mapLabels: {
      outside: "probe",
      request: "request",
      host: "laptop host",
      cgroup: "Linux cgroup",
      process: "Bun process",
    },
    cpuWork: "CPU time in a 1.5 s sample",
    cpuCapacity: "CPU allowance",
    changeCpu: "Change CPU allowance",
    memoryUsed: "Memory charged to cgroup",
    memoryLimit: "Memory limit",
    changeLimit: "Change memory limit",
    batteryMount: "Read-only power_supply mount",
    publicRoute: "DNS → tunnel → network → HTTP",
    mounted: "visible",
    hidden: "not mounted",
    reachable: "reachable",
    down: "down",
    processAge: "Bun process: up 7d",
    processAgeNote: "The process timer does not prove public reachability.",
  },
  "pt-BR": {
    label: "Laboratório dos limites de observação do runtime",
    eyebrow: "Laboratório de limites",
    title: "Um deploy, quatro respostas honestas",
    intro:
      "Escolha um observador e altere o sinal que ele realmente consegue enxergar. Cada lente responde a uma pergunta diferente.",
    selected: "lente selecionada",
    asks: "Esta lente pergunta",
    calculation: "evidência",
    cannotTell: "Não consegue informar",
    map: "Corte transversal do deploy",
    scopes: {
      process: { label: "Processo", origin: "Bun" },
      cgroup: { label: "Cgroup", origin: "container" },
      host: { label: "Host", origin: "notebook" },
      outside: { label: "Externo", origin: "sonda pública" },
    },
    questions: {
      process: "Quanto da CPU atribuída ao Bun está ocupada?",
      cgroup: "Quão perto o container está do limite de memória?",
      host: "O deploy consegue ler a bateria do notebook?",
      outside: "Um visitante alcança toda a rota pública?",
    },
    blindSpots: {
      process: "a carga de todos os outros processos do notebook",
      cgroup: "quanta RAM continua livre fora do container",
      host: "qualquer parte do host que não foi montada de propósito",
      outside: "qual camada interna falhou quando a rota está fora do ar",
    },
    units: {
      process: "da CPU atribuída",
      cgroup: "do limite de memória",
      host: "bateria",
      outside: "rota pública",
    },
    mapLabels: {
      outside: "sonda",
      request: "requisição",
      host: "host notebook",
      cgroup: "cgroup do Linux",
      process: "processo Bun",
    },
    cpuWork: "Tempo de CPU em uma amostra de 1,5 s",
    cpuCapacity: "CPU atribuída",
    changeCpu: "Alterar CPU atribuída",
    memoryUsed: "Memória contabilizada no cgroup",
    memoryLimit: "Limite de memória",
    changeLimit: "Alterar limite de memória",
    batteryMount: "Montagem somente leitura de power_supply",
    publicRoute: "DNS → túnel → rede → HTTP",
    mounted: "visível",
    hidden: "não montada",
    reachable: "acessível",
    down: "fora do ar",
    processAge: "Processo Bun: ativo há 7d",
    processAgeNote: "O relógio do processo não comprova o acesso público.",
  },
} as const;

const scopes: Scope[] = ["process", "cgroup", "host", "outside"];

const theme = {
  process: {
    tab: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
    ring: "#67e8f9",
    glow: "shadow-[0_0_24px_rgba(103,232,249,0.13)]",
  },
  cgroup: {
    tab: "border-violet-300/40 bg-violet-300/10 text-violet-100",
    ring: "#c4b5fd",
    glow: "shadow-[0_0_24px_rgba(196,181,253,0.13)]",
  },
  host: {
    tab: "border-amber-300/40 bg-amber-300/10 text-amber-100",
    ring: "#fcd34d",
    glow: "shadow-[0_0_24px_rgba(252,211,77,0.13)]",
  },
  outside: {
    tab: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
    ring: "#6ee7b7",
    glow: "shadow-[0_0_24px_rgba(110,231,183,0.13)]",
  },
} as const;

export function RuntimeVantageLab(props: RuntimeVantageLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [scope, setScope] = createSignal<Scope>("process");
  const [cpuMs, setCpuMs] = createSignal(900);
  const [cpuCount, setCpuCount] = createSignal(1);
  const [memoryUsed, setMemoryUsed] = createSignal(640);
  const [memoryLimit, setMemoryLimit] = createSignal(1024);
  const [batteryMounted, setBatteryMounted] = createSignal(true);
  const [publicRoute, setPublicRoute] = createSignal(true);
  const scopeButtons: Partial<Record<Scope, HTMLButtonElement>> = {};

  const cpuPercent = createMemo(() => Math.min(100, (cpuMs() / (1500 * cpuCount())) * 100));
  const memoryPercent = createMemo(() => Math.min(100, (memoryUsed() / memoryLimit()) * 100));
  const gaugePercent = createMemo(() => {
    if (scope() === "process") return cpuPercent();
    if (scope() === "cgroup") return memoryPercent();
    if (scope() === "host") return batteryMounted() ? 64 : 0;
    return publicRoute() ? 100 : 0;
  });
  const gaugeValue = createMemo(() => {
    if (scope() === "process") return `${cpuPercent().toFixed(1)}%`;
    if (scope() === "cgroup") return `${memoryPercent().toFixed(1)}%`;
    if (scope() === "host") return batteryMounted() ? "64%" : "n/a";
    return publicRoute() ? text().reachable : text().down;
  });
  const evidence = createMemo(() => {
    if (scope() === "process") {
      return `${cpuMs()} ms ÷ (1,500 ms × ${cpuCount()} vCPU)`;
    }
    if (scope() === "cgroup") return `${memoryUsed()} MB ÷ ${memoryLimit()} MB`;
    if (scope() === "host") {
      return batteryMounted() ? "/host-sys/…/capacity → 64" : "/host-sys/… → n/a";
    }
    return text().publicRoute;
  });
  const gaugeColor = createMemo(() => {
    if (scope() === "outside" && !publicRoute()) return "#fb7185";
    return theme[scope()].ring;
  });

  function selectWithKeyboard(event: KeyboardEvent, current: Scope) {
    const currentIndex = scopes.indexOf(current);
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % scopes.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + scopes.length) % scopes.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = scopes.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const next = scopes[nextIndex];
    setScope(next);
    scopeButtons[next]?.focus();
  }

  function mapLayerClass(layer: Scope) {
    const active = scope() === layer;
    const activeClass = active
      ? `${theme[layer].tab} ${theme[layer].glow}`
      : "border-white/[0.08] bg-slate-950/45 text-slate-600";
    return `rounded-xl border transition-colors duration-200 motion-reduce:transition-none ${activeClass}`;
  }

  return (
    <LabFrame id="runtime-vantage" label={text().label} class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(103,232,249,0.08),transparent_34%),radial-gradient(circle_at_90%_100%,rgba(196,181,253,0.08),transparent_36%),#07090d] shadow-2xl shadow-slate-950/40">
        <header class="border-b border-white/[0.07] px-4 py-4 sm:px-5">
          <p class="font-mono text-[9px] tracking-[0.2em] text-slate-500 uppercase">
            {text().eyebrow}
          </p>
          <h3 class="mt-1 text-base font-medium tracking-tight text-slate-100">{text().title}</h3>
          <p id="runtime-vantage-instructions" class="mt-1.5 max-w-xl text-xs text-slate-400">
            {text().intro}
          </p>
        </header>

        <div
          role="tablist"
          aria-label={text().selected}
          aria-describedby="runtime-vantage-instructions"
          class="grid grid-cols-2 gap-1.5 border-b border-white/[0.06] p-2 sm:grid-cols-4"
        >
          <For each={scopes}>
            {(choice) => (
              <button
                ref={(element) => (scopeButtons[choice] = element)}
                id={`runtime-vantage-tab-${choice}`}
                type="button"
                role="tab"
                aria-selected={scope() === choice}
                aria-controls="runtime-vantage-panel"
                tabIndex={scope() === choice ? 0 : -1}
                onClick={() => setScope(choice)}
                onKeyDown={(event) => selectWithKeyboard(event, choice)}
                class={`min-h-12 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100 motion-reduce:transition-none ${
                  scope() === choice
                    ? theme[choice].tab
                    : "border-transparent bg-white/[0.025] text-slate-500 hover:border-white/10 hover:text-slate-300"
                }`}
              >
                <span class="block font-mono text-[10px] font-semibold uppercase">
                  {text().scopes[choice].label}
                </span>
                <span class="mt-0.5 block text-[9px] opacity-55">
                  {text().scopes[choice].origin}
                </span>
              </button>
            )}
          </For>
        </div>

        <div
          id="runtime-vantage-panel"
          role="tabpanel"
          aria-labelledby={`runtime-vantage-tab-${scope()}`}
          class="grid gap-3 p-3 sm:p-4 md:grid-cols-[0.9fr_1.1fr]"
        >
          <div class="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
            <p class="font-mono text-[8px] tracking-[0.16em] text-slate-600 uppercase">
              {text().map}
            </p>
            <div
              class="mt-3 grid grid-cols-[4.25rem_1.25rem_minmax(0,1fr)] items-center"
              aria-hidden="true"
            >
              <div class={`${mapLayerClass("outside")} px-2 py-4 text-center`}>
                <span class="mx-auto mb-2 block size-2 rounded-full bg-current shadow-[0_0_12px_currentColor]" />
                <span class="block font-mono text-[8px] uppercase">{text().mapLabels.outside}</span>
              </div>
              <div class="relative h-px bg-gradient-to-r from-emerald-300/50 to-white/10">
                <span class="absolute -top-3.5 left-1/2 -translate-x-1/2 font-mono text-[6px] text-slate-700 uppercase">
                  {text().mapLabels.request}
                </span>
              </div>
              <div class={`${mapLayerClass("host")} min-w-0 p-2`}>
                <span class="block truncate font-mono text-[7px] uppercase">
                  {text().mapLabels.host}
                </span>
                <div class={`${mapLayerClass("cgroup")} mt-2 p-2`}>
                  <span class="block truncate font-mono text-[7px] uppercase">
                    {text().mapLabels.cgroup}
                  </span>
                  <div class={`${mapLayerClass("process")} mt-2 px-2 py-3 text-center`}>
                    <span class="mx-auto mb-1.5 block size-2 rounded-full bg-current shadow-[0_0_12px_currentColor]" />
                    <span class="block truncate font-mono text-[8px] uppercase">
                      {text().mapLabels.process}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-slate-950/50 px-2.5 py-2">
              <span
                class="size-1.5 shrink-0 rounded-full"
                style={{ "background-color": gaugeColor() }}
                aria-hidden="true"
              />
              <p class="min-w-0 truncate font-mono text-[8px] tracking-wide text-slate-500 uppercase">
                {text().selected}: {text().scopes[scope()].label} / {text().scopes[scope()].origin}
              </p>
            </div>
          </div>

          <div class="flex min-h-52 flex-col rounded-2xl border border-white/[0.07] bg-slate-950/50 p-3.5">
            <p class="font-mono text-[8px] tracking-[0.16em] text-slate-600 uppercase">
              {text().asks}
            </p>
            <p class="mt-1 min-h-10 text-sm leading-snug text-slate-200">
              {text().questions[scope()]}
            </p>

            <div class="mt-3 flex items-center gap-3">
              <div
                class="grid size-20 shrink-0 place-items-center rounded-full p-[5px] transition-[background] duration-300 motion-reduce:transition-none"
                style={`background:conic-gradient(${gaugeColor()} ${gaugePercent()}%,rgba(51,65,85,.28) 0)`}
                aria-hidden="true"
              >
                <div class="size-full rounded-full bg-[#090b10]" />
              </div>
              <output class="min-w-0" aria-live="polite">
                <span
                  class={`block font-mono text-xl leading-none font-semibold tabular-nums ${
                    scope() === "outside" && !publicRoute() ? "text-rose-300" : "text-slate-100"
                  }`}
                >
                  {gaugeValue()}
                </span>
                <span class="mt-1 block font-mono text-[8px] tracking-[0.12em] text-slate-600 uppercase">
                  {text().units[scope()]}
                </span>
              </output>
            </div>

            <div class="mt-3 border-t border-white/[0.06] pt-2.5">
              <p class="font-mono text-[8px] text-slate-600 uppercase">{text().calculation}</p>
              <code class="mt-1 block truncate font-mono text-[9px] text-slate-400">
                {evidence()}
              </code>
            </div>
            <p class="mt-auto pt-3 text-[10px] leading-relaxed text-slate-500">
              <span class="text-slate-400">{text().cannotTell}:</span> {text().blindSpots[scope()]}.
            </p>
          </div>
        </div>

        <div class="border-t border-white/[0.06] bg-white/[0.018] px-3 py-3 sm:px-4">
          <Show when={scope() === "process"}>
            <div class="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
              <label class="font-mono text-[9px] text-slate-500">
                <span class="mb-1.5 flex justify-between gap-3">
                  <span>{text().cpuWork}</span>
                  <output class="text-cyan-200 tabular-nums">{cpuMs()} ms</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max={1500 * cpuCount()}
                  step="100"
                  value={cpuMs()}
                  onInput={(event) => setCpuMs(event.currentTarget.valueAsNumber)}
                  class="h-8 w-full cursor-pointer accent-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                />
              </label>
              <button
                type="button"
                aria-label={`${text().changeCpu}: ${cpuCount()} vCPU`}
                onClick={() =>
                  setCpuCount((value) => {
                    const next = value === 4 ? 1 : value + 1;
                    setCpuMs((work) => Math.min(work, 1500 * next));
                    return next;
                  })
                }
                class="min-h-11 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 font-mono text-[9px] text-cyan-100 transition-colors hover:bg-cyan-300/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 motion-reduce:transition-none"
              >
                {text().cpuCapacity}: <strong>{cpuCount()} vCPU</strong>
              </button>
            </div>
          </Show>

          <Show when={scope() === "cgroup"}>
            <div class="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
              <label class="font-mono text-[9px] text-slate-500">
                <span class="mb-1.5 flex justify-between gap-3">
                  <span>{text().memoryUsed}</span>
                  <output class="text-violet-200 tabular-nums">{memoryUsed()} MB</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max={memoryLimit()}
                  step="64"
                  value={memoryUsed()}
                  onInput={(event) => setMemoryUsed(event.currentTarget.valueAsNumber)}
                  class="h-8 w-full cursor-pointer accent-violet-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200"
                />
              </label>
              <button
                type="button"
                aria-label={`${text().changeLimit}: ${memoryLimit()} MB`}
                onClick={() => {
                  const next = memoryLimit() === 2048 ? 512 : memoryLimit() + 512;
                  setMemoryLimit(next);
                  setMemoryUsed((value) => Math.min(value, next));
                }}
                class="min-h-11 rounded-xl border border-violet-300/20 bg-violet-300/10 px-3 font-mono text-[9px] text-violet-100 transition-colors hover:bg-violet-300/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200 motion-reduce:transition-none"
              >
                {text().memoryLimit}: <strong>{memoryLimit()} MB</strong>
              </button>
            </div>
          </Show>

          <Show when={scope() === "host"}>
            <button
              type="button"
              role="switch"
              aria-checked={batteryMounted()}
              onClick={() => setBatteryMounted((value) => !value)}
              class="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-slate-950/45 px-3 text-left transition-colors hover:border-amber-300/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 motion-reduce:transition-none"
            >
              <span class="font-mono text-[9px] text-slate-400">{text().batteryMount}</span>
              <span
                class={`rounded-full border px-2.5 py-1 font-mono text-[8px] uppercase ${
                  batteryMounted()
                    ? "border-amber-300/25 bg-amber-300/10 text-amber-200"
                    : "border-slate-700 bg-slate-800/40 text-slate-500"
                }`}
              >
                {batteryMounted() ? text().mounted : text().hidden}
              </span>
            </button>
          </Show>

          <Show when={scope() === "outside"}>
            <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                role="switch"
                aria-checked={publicRoute()}
                onClick={() => setPublicRoute((value) => !value)}
                class="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-slate-950/45 px-3 text-left transition-colors hover:border-emerald-300/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 motion-reduce:transition-none"
              >
                <span class="font-mono text-[9px] text-slate-400">{text().publicRoute}</span>
                <span
                  class={`rounded-full border px-2.5 py-1 font-mono text-[8px] uppercase ${
                    publicRoute()
                      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
                      : "border-rose-300/25 bg-rose-300/10 text-rose-200"
                  }`}
                >
                  {publicRoute() ? text().reachable : text().down}
                </span>
              </button>
              <div class="rounded-xl border border-dashed border-slate-700/70 px-3 py-2">
                <p class="font-mono text-[8px] text-slate-400">{text().processAge}</p>
                <p class="mt-0.5 max-w-44 text-[8px] leading-snug text-slate-600">
                  {text().processAgeNote}
                </p>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </LabFrame>
  );
}
