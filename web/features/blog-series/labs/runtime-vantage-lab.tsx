import { createMemo, createSignal } from "solid-js";
import { ConceptLab, LabCard, LabMetric } from "@web/features/blog-series/components/concept-lab";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type RuntimeVantageLabProps = {
  locale?: LabLocale;
};

const copy = {
  "en-US": {
    eyebrow: "Interactive concept lab",
    title: "Choose the observer before reading the number",
    description:
      "Change container and host conditions. The displayed value is only meaningful when its measurement boundary is named.",
    cpu: "Process CPU against cgroup capacity",
    processCpu: "CPU time used in a 1.5 s sample",
    cpuQuota: "Available vCPUs",
    cpuUsage: "Reported CPU",
    cpuHint: "process.cpuUsage ÷ elapsed time ÷ available CPUs",
    memory: "Memory boundary",
    cgroupAvailable: "Finite cgroup memory files are available",
    cgroupUsed: "Container memory used",
    cgroupLimit: "Container memory limit",
    memoryUsage: "Reported memory",
    cgroupSource: "cgroup current ÷ cgroup limit",
    hostSource: "host used ÷ host total fallback",
    hostContext: "Host context: 8 GB used of 16 GB",
    outside: "Host and outside observers",
    batteryMounted: "Host power_supply is mounted read-only",
    publicReachable: "Public route is reachable",
    battery: "Battery",
    uptime: "Public uptime",
    processAge: "Process age",
    batteryValue: "64% · discharging",
    unavailable: "n/a",
    reachable: "36 h reachable streak",
    down: "0 s · public path is down",
    alive: "7 days · process still alive",
    takeawayUp:
      "The process, cgroup, host mount, and external monitor agree only because each answers a different operational question.",
    takeawayDown:
      "A live process does not prove public availability. The external observer catches failures in DNS, tunnel, network, container, or HTTP routing.",
  },
  "pt-BR": {
    eyebrow: "Laboratório interativo",
    title: "Escolha o observador antes de interpretar o número",
    description:
      "Altere as condições do container e do host. O valor exibido só ganha significado quando a fronteira da medição é identificada.",
    cpu: "CPU do processo contra a capacidade do cgroup",
    processCpu: "Tempo de CPU usado em uma amostra de 1,5 s",
    cpuQuota: "vCPUs disponíveis",
    cpuUsage: "CPU informada",
    cpuHint: "process.cpuUsage ÷ tempo transcorrido ÷ CPUs disponíveis",
    memory: "Fronteira da memória",
    cgroupAvailable: "Arquivos de memória com limite finito estão disponíveis",
    cgroupUsed: "Memória usada pelo container",
    cgroupLimit: "Limite de memória do container",
    memoryUsage: "Memória informada",
    cgroupSource: "uso atual do cgroup ÷ limite do cgroup",
    hostSource: "fallback de memória usada ÷ total do host",
    hostContext: "Contexto do host: 8 GB usados de 16 GB",
    outside: "Observadores do host e externos",
    batteryMounted: "power_supply do host está montado como somente leitura",
    publicReachable: "Caminho público está acessível",
    battery: "Bateria",
    uptime: "Uptime público",
    processAge: "Idade do processo",
    batteryValue: "64% · descarregando",
    unavailable: "n/a",
    reachable: "36 h de sequência acessível",
    down: "0 s · caminho público está fora do ar",
    alive: "7 dias · processo ainda está vivo",
    takeawayUp:
      "Processo, cgroup, montagem do host e monitor externo só concordam porque cada um responde a uma pergunta operacional diferente.",
    takeawayDown:
      "Um processo vivo não prova disponibilidade pública. O observador externo captura falhas em DNS, túnel, rede, container ou roteamento HTTP.",
  },
} as const;

const SAMPLE_MS = 1500;
const HOST_USED_MB = 8 * 1024;
const HOST_TOTAL_MB = 16 * 1024;

export function RuntimeVantageLab(props: RuntimeVantageLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [processCpuMs, setProcessCpuMs] = createSignal(900);
  const [cpuCount, setCpuCount] = createSignal(1);
  const [hasCgroupMemory, setHasCgroupMemory] = createSignal(true);
  const [cgroupUsedMb, setCgroupUsedMb] = createSignal(640);
  const [cgroupLimitMb, setCgroupLimitMb] = createSignal(1024);
  const [batteryMounted, setBatteryMounted] = createSignal(true);
  const [publicReachable, setPublicReachable] = createSignal(true);

  const cpuPercent = createMemo(() =>
    Math.min(100, Math.max(0, (processCpuMs() / (SAMPLE_MS * cpuCount())) * 100)),
  );
  const effectiveMemory = createMemo(() =>
    hasCgroupMemory()
      ? { used: Math.min(cgroupUsedMb(), cgroupLimitMb()), total: cgroupLimitMb() }
      : { used: HOST_USED_MB, total: HOST_TOTAL_MB },
  );
  const memoryPercent = createMemo(() => (effectiveMemory().used / effectiveMemory().total) * 100);

  return (
    <ConceptLab
      id="runtime-vantage"
      eyebrow={text().eyebrow}
      title={text().title}
      description={text().description}
    >
      <div class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-2">
          <LabCard title={text().cpu} accent="amber">
            <div class="space-y-3">
              <label class="block text-xs text-slate-300">
                <span class="flex justify-between gap-3">
                  <span>{text().processCpu}</span>
                  <output>{processCpuMs()} ms</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="6000"
                  step="100"
                  value={processCpuMs()}
                  onInput={(event) => setProcessCpuMs(event.currentTarget.valueAsNumber)}
                  class="mt-2 w-full accent-amber-400"
                />
              </label>
              <label class="block text-xs text-slate-300">
                <span class="flex justify-between gap-3">
                  <span>{text().cpuQuota}</span>
                  <output>{cpuCount()}</output>
                </span>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={cpuCount()}
                  onInput={(event) => setCpuCount(event.currentTarget.valueAsNumber)}
                  class="mt-2 w-full accent-amber-400"
                />
              </label>
              <LabMetric
                label={text().cpuUsage}
                value={`${cpuPercent().toFixed(1)}%`}
                hint={text().cpuHint}
              />
            </div>
          </LabCard>

          <LabCard title={text().memory} accent="blue">
            <div class="space-y-3">
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200">
                <span>{text().cgroupAvailable}</span>
                <input
                  type="checkbox"
                  checked={hasCgroupMemory()}
                  onChange={(event) => setHasCgroupMemory(event.currentTarget.checked)}
                  class="size-4 accent-blue-400"
                />
              </label>
              <label class="block text-xs text-slate-300">
                <span class="flex justify-between gap-3">
                  <span>{text().cgroupUsed}</span>
                  <output>{cgroupUsedMb()} MB</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max={cgroupLimitMb()}
                  step="64"
                  value={Math.min(cgroupUsedMb(), cgroupLimitMb())}
                  onInput={(event) => setCgroupUsedMb(event.currentTarget.valueAsNumber)}
                  disabled={!hasCgroupMemory()}
                  class="mt-2 w-full accent-blue-400 disabled:opacity-35"
                />
              </label>
              <label class="block text-xs text-slate-300">
                <span class="flex justify-between gap-3">
                  <span>{text().cgroupLimit}</span>
                  <output>{cgroupLimitMb()} MB</output>
                </span>
                <input
                  type="range"
                  min="512"
                  max="4096"
                  step="512"
                  value={cgroupLimitMb()}
                  onInput={(event) => {
                    const nextLimit = event.currentTarget.valueAsNumber;
                    setCgroupLimitMb(nextLimit);
                    setCgroupUsedMb((current) => Math.min(current, nextLimit));
                  }}
                  disabled={!hasCgroupMemory()}
                  class="mt-2 w-full accent-blue-400 disabled:opacity-35"
                />
              </label>
              <LabMetric
                label={text().memoryUsage}
                value={`${effectiveMemory().used} / ${effectiveMemory().total} MB · ${memoryPercent().toFixed(1)}%`}
                hint={hasCgroupMemory() ? text().cgroupSource : text().hostSource}
              />
              <p class="text-xxs text-slate-500">{text().hostContext}</p>
            </div>
          </LabCard>
        </div>

        <LabCard title={text().outside} accent="emerald">
          <div class="space-y-3">
            <div class="grid gap-2 sm:grid-cols-2">
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200">
                <span>{text().batteryMounted}</span>
                <input
                  type="checkbox"
                  checked={batteryMounted()}
                  onChange={(event) => setBatteryMounted(event.currentTarget.checked)}
                  class="size-4 accent-emerald-400"
                />
              </label>
              <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200">
                <span>{text().publicReachable}</span>
                <input
                  type="checkbox"
                  checked={publicReachable()}
                  onChange={(event) => setPublicReachable(event.currentTarget.checked)}
                  class="size-4 accent-emerald-400"
                />
              </label>
            </div>
            <div class="grid gap-2 sm:grid-cols-3" aria-live="polite">
              <LabMetric
                label={text().battery}
                value={batteryMounted() ? text().batteryValue : text().unavailable}
              />
              <LabMetric
                label={text().uptime}
                value={publicReachable() ? text().reachable : text().down}
              />
              <LabMetric label={text().processAge} value={text().alive} />
            </div>
          </div>
        </LabCard>

        <p
          class="rounded-lg border border-slate-200/10 bg-slate-900/45 px-3 py-2.5 text-sm leading-relaxed text-slate-200/80"
          aria-live="polite"
        >
          {publicReachable() ? text().takeawayUp : text().takeawayDown}
        </p>
      </div>
    </ConceptLab>
  );
}
