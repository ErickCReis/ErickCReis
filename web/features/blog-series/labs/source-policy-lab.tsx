import { createMemo, createSignal, Show } from "solid-js";
import { ConceptLab, LabCard, LabMetric } from "@web/features/blog-series/components/concept-lab";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type SourceId = "spotify" | "github";
type SpotifyScenario = "playing" | "idle" | "rate-limited";

type SourcePolicyLabProps = {
  locale?: LabLocale;
};

const copy = {
  "en-US": {
    eyebrow: "Interactive concept lab",
    title: "Give each source its own clock",
    description:
      "Change source conditions and observe the collection decision. A shared panel shape does not require a shared polling or persistence policy.",
    source: "Telemetry source",
    sources: { spotify: "Spotify playback", github: "GitHub contributions" },
    conditions: "Source conditions",
    spotifyScenarios: {
      playing: "Track playing",
      idle: "Nothing playing",
      "rate-limited": "429 + Retry-After: 42",
    },
    cacheAge: "Disk cache age",
    cacheFresh: "Fresh enough for startup",
    cacheStale: "Expired at 30 minutes",
    githubRateLimit: "Request is rate-limited without a reset header",
    decision: "Collector decision",
    requestNow: "Request now",
    nextRequest: "Next request",
    restartState: "State after restart",
    yes: "yes",
    no: "no",
    seconds: "seconds",
    minutes: "minutes",
    spotifyRestart: "Empty playback snapshot; history was process-local.",
    githubRestartFresh: "Load the validated disk cache immediately.",
    githubRestartStale: "Start empty and refresh the upstream API.",
    explanations: {
      spotifyPlaying:
        "Active playback changes quickly, so the collector checks every 2.5 seconds and keeps progress believable.",
      spotifyIdle:
        "An empty state changes less urgently, so the same module backs off to 15 seconds.",
      spotifyRate:
        "The provider's Retry-After value overrides the normal playback interval. No new empty snapshot replaces the current one.",
      githubFresh:
        "A cache younger than 30 minutes supplies the panel and delays the request until that snapshot expires.",
      githubRefresh:
        "An expired cache is not used as the current panel value, so the collector requests a fresh year-to-date calendar now.",
      githubRate:
        "The failed request schedules another attempt after the rate-limit delay instead of polling on the normal 30-minute clock.",
    },
  },
  "pt-BR": {
    eyebrow: "Laboratório interativo",
    title: "Dê a cada fonte o próprio relógio",
    description:
      "Altere as condições das fontes e observe a decisão de coleta. Um formato comum de painel não exige a mesma política de polling ou persistência.",
    source: "Fonte de telemetria",
    sources: { spotify: "Reprodução do Spotify", github: "Contribuições do GitHub" },
    conditions: "Condições da fonte",
    spotifyScenarios: {
      playing: "Faixa tocando",
      idle: "Nada tocando",
      "rate-limited": "429 + Retry-After: 42",
    },
    cacheAge: "Idade do cache em disco",
    cacheFresh: "Novo o bastante para iniciar",
    cacheStale: "Expira aos 30 minutos",
    githubRateLimit: "A requisição é limitada sem um cabeçalho de reset",
    decision: "Decisão do coletor",
    requestNow: "Requisitar agora",
    nextRequest: "Próxima requisição",
    restartState: "Estado após reiniciar",
    yes: "sim",
    no: "não",
    seconds: "segundos",
    minutes: "minutos",
    spotifyRestart: "Retrato de reprodução vazio; o histórico vivia no processo.",
    githubRestartFresh: "Carrega imediatamente o cache validado do disco.",
    githubRestartStale: "Começa vazio e atualiza a partir da API externa.",
    explanations: {
      spotifyPlaying:
        "A reprodução ativa muda depressa, então o coletor consulta a cada 2,5 segundos e mantém o progresso convincente.",
      spotifyIdle:
        "Um estado vazio muda com menos urgência, então o mesmo módulo recua para 15 segundos.",
      spotifyRate:
        "O valor de Retry-After do provedor substitui o intervalo normal. Nenhum novo retrato vazio apaga o valor atual.",
      githubFresh:
        "Um cache com menos de 30 minutos preenche o painel e adia a consulta até o retrato expirar.",
      githubRefresh:
        "Um cache vencido não vira o valor atual do painel, então o coletor pede agora um novo calendário desde o início do ano.",
      githubRate:
        "A requisição que falhou agenda outra tentativa após o intervalo de rate limit, em vez de seguir o relógio normal de 30 minutos.",
    },
  },
} as const;

export function SourcePolicyLab(props: SourcePolicyLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [source, setSource] = createSignal<SourceId>("spotify");
  const [spotifyScenario, setSpotifyScenario] = createSignal<SpotifyScenario>("playing");
  const [cacheAgeMinutes, setCacheAgeMinutes] = createSignal(12);
  const [githubRateLimited, setGithubRateLimited] = createSignal(false);

  const githubCacheIsFresh = createMemo(() => cacheAgeMinutes() < 30);
  const requestNow = createMemo(() => {
    if (source() === "spotify") return true;
    return !githubCacheIsFresh();
  });
  const nextDelay = createMemo(() => {
    if (source() === "spotify") {
      if (spotifyScenario() === "playing") return `2.5 ${text().seconds}`;
      if (spotifyScenario() === "idle") return `15 ${text().seconds}`;
      return `42 ${text().seconds}`;
    }

    if (githubCacheIsFresh()) {
      return `${30 - cacheAgeMinutes()} ${text().minutes}`;
    }
    return githubRateLimited() ? `15 ${text().minutes}` : `30 ${text().minutes}`;
  });
  const restartState = createMemo(() => {
    if (source() === "spotify") return text().spotifyRestart;
    return githubCacheIsFresh() ? text().githubRestartFresh : text().githubRestartStale;
  });
  const explanation = createMemo(() => {
    if (source() === "spotify") {
      if (spotifyScenario() === "playing") return text().explanations.spotifyPlaying;
      if (spotifyScenario() === "idle") return text().explanations.spotifyIdle;
      return text().explanations.spotifyRate;
    }
    if (githubCacheIsFresh()) return text().explanations.githubFresh;
    return githubRateLimited() ? text().explanations.githubRate : text().explanations.githubRefresh;
  });

  return (
    <ConceptLab
      id="source-policy"
      eyebrow={text().eyebrow}
      title={text().title}
      description={text().description}
    >
      <div class="space-y-4">
        <div class="grid gap-2 sm:grid-cols-2" role="group" aria-label={text().source}>
          {(["spotify", "github"] as const).map((item) => (
            <button
              type="button"
              onClick={() => setSource(item)}
              aria-pressed={source() === item}
              class={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                source() === item
                  ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-50"
                  : "border-slate-200/10 bg-slate-900/30 text-slate-300 hover:border-slate-200/25"
              }`}
            >
              {text().sources[item]}
            </button>
          ))}
        </div>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <LabCard title={text().conditions} accent="slate">
            <Show
              when={source() === "spotify"}
              fallback={
                <div class="space-y-4">
                  <label class="block text-xs text-slate-300">
                    <span class="flex justify-between gap-3">
                      <span>{text().cacheAge}</span>
                      <output>{cacheAgeMinutes()} min</output>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={cacheAgeMinutes()}
                      onInput={(event) => setCacheAgeMinutes(event.currentTarget.valueAsNumber)}
                      class="mt-2 w-full accent-blue-400"
                    />
                    <span class="mt-1 flex justify-between text-xxs text-slate-500">
                      <span>{text().cacheFresh}</span>
                      <span>{text().cacheStale}</span>
                    </span>
                  </label>
                  <label class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200">
                    <span>{text().githubRateLimit}</span>
                    <input
                      type="checkbox"
                      checked={githubRateLimited()}
                      onChange={(event) => setGithubRateLimited(event.currentTarget.checked)}
                      disabled={githubCacheIsFresh()}
                      class="size-4 accent-blue-400 disabled:opacity-40"
                    />
                  </label>
                </div>
              }
            >
              <div class="space-y-2" role="group" aria-label={text().conditions}>
                {(["playing", "idle", "rate-limited"] as const).map((item) => (
                  <button
                    type="button"
                    onClick={() => setSpotifyScenario(item)}
                    aria-pressed={spotifyScenario() === item}
                    class={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      spotifyScenario() === item
                        ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-50"
                        : "border-slate-200/10 bg-slate-950/35 text-slate-300"
                    }`}
                  >
                    {text().spotifyScenarios[item]}
                  </button>
                ))}
              </div>
            </Show>
          </LabCard>

          <LabCard title={text().decision} accent={source() === "spotify" ? "emerald" : "blue"}>
            <div class="space-y-3" aria-live="polite">
              <div class="grid gap-2 sm:grid-cols-2">
                <LabMetric
                  label={text().requestNow}
                  value={requestNow() ? text().yes : text().no}
                />
                <LabMetric label={text().nextRequest} value={nextDelay()} />
              </div>
              <LabMetric label={text().restartState} value={restartState()} />
            </div>
          </LabCard>
        </div>

        <p
          class="rounded-lg border border-amber-200/15 bg-amber-300/5 px-3 py-2.5 text-sm leading-relaxed text-amber-50/80"
          aria-live="polite"
        >
          {explanation()}
        </p>
      </div>
    </ConceptLab>
  );
}
