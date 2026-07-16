import { createMemo, createSignal, For } from "solid-js";
import { ConceptLab, LabCard, LabMetric } from "@web/features/blog-series/components/concept-lab";
import { resolveLabLocale, selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type DeploymentMode = "platform" | "single";
type CapabilityId = "pages" | "api" | "realtime" | "data" | "jobs";

type DeploymentShapeLabProps = {
  locale?: LabLocale;
};

const copy = {
  "en-US": {
    eyebrow: "Interactive concept lab",
    title: "Move the deployment boundary",
    description:
      "Choose what the site needs, then compare who owns each capability. The feature list stays the same; the runtime boundaries and responsibilities move.",
    modes: {
      platform: "Platform-oriented",
      single: "Single self-hosted server",
    },
    choose: "Required capabilities",
    owners: "Runtime owners",
    boundaries: "Runtime boundaries",
    activeCapabilities: "Capabilities",
    ownerHint: "Distinct owners needed by the selected capabilities.",
    capabilityHint:
      "Turn capabilities on and off to see whether the architecture still pays for a boundary.",
    takeaway: {
      platform:
        "Managed owners reduce local operational work, but every selected capability adds platform coordination.",
      single:
        "One process removes deployment boundaries, but connection lifecycle, persistence, and monitoring become local responsibilities.",
    },
  },
  "pt-BR": {
    eyebrow: "Laboratório interativo",
    title: "Mova a fronteira do deploy",
    description:
      "Escolha o que o site precisa e compare quem cuida de cada capacidade. A lista de funcionalidades permanece; as fronteiras de runtime e as responsabilidades mudam.",
    modes: {
      platform: "Orientado à plataforma",
      single: "Um servidor self-hosted",
    },
    choose: "Capacidades necessárias",
    owners: "Responsáveis em runtime",
    boundaries: "Fronteiras de runtime",
    activeCapabilities: "Capacidades",
    ownerHint: "Responsáveis distintos exigidos pelas capacidades selecionadas.",
    capabilityHint:
      "Ative e desative capacidades para observar quando a arquitetura ainda paga por uma fronteira.",
    takeaway: {
      platform:
        "Serviços gerenciados reduzem o trabalho operacional local, mas cada capacidade selecionada acrescenta coordenação com a plataforma.",
      single:
        "Um processo remove fronteiras de deploy, mas ciclo de vida das conexões, persistência e monitoramento viram responsabilidades locais.",
    },
  },
} as const;

const capabilities: Array<{
  id: CapabilityId;
  label: Record<LabLocale, string>;
  platformOwner: Record<LabLocale, string>;
  singleOwner: Record<LabLocale, string>;
}> = [
  {
    id: "pages",
    label: { "en-US": "Static pages", "pt-BR": "Páginas estáticas" },
    platformOwner: { "en-US": "Edge site", "pt-BR": "Site na borda" },
    singleOwner: { "en-US": "Bun + Elysia", "pt-BR": "Bun + Elysia" },
  },
  {
    id: "api",
    label: { "en-US": "Runtime APIs", "pt-BR": "APIs de runtime" },
    platformOwner: { "en-US": "Worker service", "pt-BR": "Serviço Worker" },
    singleOwner: { "en-US": "Bun + Elysia", "pt-BR": "Bun + Elysia" },
  },
  {
    id: "realtime",
    label: { "en-US": "Realtime state", "pt-BR": "Estado em tempo real" },
    platformOwner: { "en-US": "Durable Object", "pt-BR": "Durable Object" },
    singleOwner: { "en-US": "Bun + Elysia", "pt-BR": "Bun + Elysia" },
  },
  {
    id: "data",
    label: { "en-US": "Persistent data", "pt-BR": "Dados persistentes" },
    platformOwner: { "en-US": "Managed database", "pt-BR": "Banco gerenciado" },
    singleOwner: { "en-US": "Bun + Elysia", "pt-BR": "Bun + Elysia" },
  },
  {
    id: "jobs",
    label: { "en-US": "Background jobs", "pt-BR": "Tarefas em segundo plano" },
    platformOwner: { "en-US": "Scheduled worker", "pt-BR": "Worker agendado" },
    singleOwner: { "en-US": "Bun + Elysia", "pt-BR": "Bun + Elysia" },
  },
];

export function DeploymentShapeLab(props: DeploymentShapeLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const locale = () => resolveLabLocale(props.locale);
  const [mode, setMode] = createSignal<DeploymentMode>("single");
  const [enabled, setEnabled] = createSignal<Record<CapabilityId, boolean>>({
    pages: true,
    api: true,
    realtime: true,
    data: true,
    jobs: true,
  });

  const selectedCapabilities = createMemo(() =>
    capabilities.filter((capability) => enabled()[capability.id]),
  );
  const ownerFor = (capability: (typeof capabilities)[number]) =>
    mode() === "platform" ? capability.platformOwner[locale()] : capability.singleOwner[locale()];
  const ownerCount = createMemo(() => {
    const owners = new Set(selectedCapabilities().map(ownerFor));
    return owners.size;
  });

  const toggleCapability = (id: CapabilityId) => {
    setEnabled((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <ConceptLab
      id="deployment-shape"
      eyebrow={text().eyebrow}
      title={text().title}
      description={text().description}
    >
      <div class="space-y-4">
        <div class="grid gap-2 sm:grid-cols-2" role="group" aria-label={text().title}>
          {(["platform", "single"] as const).map((item) => (
            <button
              type="button"
              onClick={() => setMode(item)}
              aria-pressed={mode() === item}
              class={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                mode() === item
                  ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-50"
                  : "border-slate-200/10 bg-slate-900/30 text-slate-300 hover:border-slate-200/25"
              }`}
            >
              {text().modes[item]}
            </button>
          ))}
        </div>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <LabCard title={text().choose} accent="slate">
            <div>
              <div class="space-y-2">
                <For each={capabilities}>
                  {(capability) => (
                    <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200">
                      <span>{capability.label[locale()]}</span>
                      <input
                        type="checkbox"
                        checked={enabled()[capability.id]}
                        onChange={() => toggleCapability(capability.id)}
                        class="size-4 accent-emerald-400"
                      />
                    </label>
                  )}
                </For>
              </div>
              <p class="mt-3 text-xs leading-relaxed text-slate-400">{text().capabilityHint}</p>
            </div>
          </LabCard>

          <LabCard title={text().owners} accent={mode() === "single" ? "emerald" : "blue"}>
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-2">
                <LabMetric label={text().boundaries} value={ownerCount()} hint={text().ownerHint} />
                <LabMetric
                  label={text().activeCapabilities}
                  value={selectedCapabilities().length}
                />
              </div>

              <div class="space-y-1.5" aria-live="polite">
                <For each={selectedCapabilities()}>
                  {(capability) => (
                    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-slate-950/45 px-3 py-2 text-xs">
                      <span class="text-slate-300">{capability.label[locale()]}</span>
                      <span class="rounded-full border border-slate-200/10 px-2 py-1 font-mono text-xxs text-slate-100">
                        {ownerFor(capability)}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </LabCard>
        </div>

        <p
          class="rounded-lg border border-amber-200/15 bg-amber-300/5 px-3 py-2.5 text-sm leading-relaxed text-amber-50/80"
          aria-live="polite"
        >
          {text().takeaway[mode()]}
        </p>
      </div>
    </ConceptLab>
  );
}
