import { For, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type SourcePolicyLabProps = { locale?: LabLocale };
type SpotifyState = "playing" | "idle" | "limited";
type GitHubState = "ready" | "limited";

const copy = {
  "en-US": {
    label: "Spotify and GitHub source policy simulator",
    eyebrow: "Same panel contract · different source clocks",
    instruction: "Change the source conditions and follow the next request.",
    spotify: "Spotify",
    github: "GitHub",
    sourceState: "Source state",
    apiResponse: "Next API response",
    states: {
      playing: "playing",
      idle: "idle",
      limited: "429",
      ready: "available",
    },
    spotifyReasons: {
      playing: "Playback changes quickly, so the snapshot stays close to the track.",
      idle: "Nothing is moving; a slower check is enough.",
      limited: "The server honors Retry-After. This response asks for 42 seconds.",
    },
    cacheAtRestart: "Cache age at restart",
    freshUntil: "fresh < 30 min",
    expired: "expired",
    cacheHit: "serve cached snapshot",
    cacheHitDetail: "No GraphQL request is needed yet.",
    fetchNow: "fetch a fresh window",
    fetchNowDetail: "The disk snapshot is too old to hydrate the panel.",
    backoff: "wait for rate-limit reset",
    backoffDetail: "The attempted refresh was limited; fallback shown is 15 min.",
    nextRequest: "Next request",
    now: "now",
    storage: "Retention",
    memory: "memory · 84 snapshots",
    memoryDetail: "restart clears playback context",
    disk: "disk · one aggregate snapshot",
    diskDetail: "restart can restore a fresh cache",
    boundary: "Browser boundary",
    spotifyBoundary: "track metadata only",
    githubBoundary: "derived counts only",
    contract: "normalized snapshot",
    stream: "shared telemetry stream",
    panel: "small Solid panel",
  },
  "pt-BR": {
    label: "Simulador das políticas de origem do Spotify e do GitHub",
    eyebrow: "Mesmo contrato de painel · relógios diferentes",
    instruction: "Mude as condições das fontes e acompanhe a próxima consulta.",
    spotify: "Spotify",
    github: "GitHub",
    sourceState: "Estado da fonte",
    apiResponse: "Próxima resposta da API",
    states: {
      playing: "tocando",
      idle: "parado",
      limited: "429",
      ready: "disponível",
    },
    spotifyReasons: {
      playing: "A reprodução muda rápido, então o retrato acompanha a faixa de perto.",
      idle: "Nada está avançando; uma consulta mais lenta é suficiente.",
      limited: "O servidor respeita Retry-After. Esta resposta pede 42 segundos.",
    },
    cacheAtRestart: "Idade do cache ao reiniciar",
    freshUntil: "válido < 30 min",
    expired: "expirado",
    cacheHit: "servir retrato do cache",
    cacheHitDetail: "Ainda não é preciso consultar o GraphQL.",
    fetchNow: "buscar uma janela nova",
    fetchNowDetail: "O retrato em disco está velho demais para preencher o painel.",
    backoff: "aguardar a renovação da cota",
    backoffDetail:
      "A tentativa de atualização atingiu o limite; o intervalo padrão exibido é de 15 min.",
    nextRequest: "Próxima consulta",
    now: "agora",
    storage: "Retenção",
    memory: "memória · 84 retratos",
    memoryDetail: "reiniciar apaga o contexto de reprodução",
    disk: "disco · um retrato agregado",
    diskDetail: "reiniciar pode restaurar um cache válido",
    boundary: "Fronteira do navegador",
    spotifyBoundary: "somente metadados da faixa",
    githubBoundary: "somente contagens derivadas",
    contract: "retrato normalizado",
    stream: "fluxo compartilhado de telemetria",
    panel: "painel compacto em Solid",
  },
} as const;

const spotifyStates: SpotifyState[] = ["playing", "idle", "limited"];
const githubStates: GitHubState[] = ["ready", "limited"];

const spotifyDelay: Record<SpotifyState, string> = {
  playing: "2.5 s",
  idle: "15 s",
  limited: "42 s",
};

export function SourcePolicyLab(props: SourcePolicyLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [spotifyState, setSpotifyState] = createSignal<SpotifyState>("playing");
  const [cacheAge, setCacheAge] = createSignal(12);
  const [githubState, setGitHubState] = createSignal<GitHubState>("ready");

  const cacheFresh = createMemo(() => cacheAge() < 30);
  const cacheProgress = createMemo(() => `${Math.min(100, (cacheAge() / 45) * 100)}%`);
  const githubDecision = createMemo(() => {
    if (cacheFresh()) {
      return {
        action: text().cacheHit,
        detail: text().cacheHitDetail,
        delay: `${30 - cacheAge()} min`,
        tone: "border-sky-300/20 bg-sky-300/8 text-sky-100",
      };
    }

    if (githubState() === "limited") {
      return {
        action: text().backoff,
        detail: text().backoffDetail,
        delay: "15 min",
        tone: "border-rose-300/20 bg-rose-300/8 text-rose-100",
      };
    }

    return {
      action: text().fetchNow,
      detail: text().fetchNowDetail,
      delay: text().now,
      tone: "border-amber-300/20 bg-amber-300/8 text-amber-100",
    };
  });

  return (
    <LabFrame id="source-policy" label={text().label} class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-2xl border border-slate-200/10 bg-[#080b10] shadow-2xl shadow-slate-950/30">
        <header class="flex flex-col gap-1 border-b border-slate-200/10 bg-slate-950/35 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
          <p class="font-mono text-[10px] tracking-[0.14em] text-slate-300 uppercase">
            {text().eyebrow}
          </p>
          <p class="text-[11px] text-slate-400">{text().instruction}</p>
        </header>

        <div class="grid sm:grid-cols-2">
          <article class="relative flex min-w-0 flex-col gap-4 border-b border-slate-200/10 p-4 sm:border-r sm:border-b-0">
            <div class="pointer-events-none absolute top-0 right-0 size-36 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_68%)]" />
            <div class="relative flex items-center justify-between">
              <h3 class="flex items-center gap-2 font-mono text-xs font-medium text-emerald-100">
                <span class="size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)]" />
                {text().spotify}
              </h3>
              <code class="rounded-full border border-emerald-200/10 bg-emerald-300/5 px-2 py-1 text-[9px] text-emerald-200/65">
                GET /currently-playing
              </code>
            </div>

            <fieldset>
              <legend class="mb-1.5 font-mono text-[9px] tracking-[0.12em] text-slate-400 uppercase">
                {text().sourceState}
              </legend>
              <div class="grid grid-cols-3 gap-1 rounded-lg bg-slate-950/70 p-1">
                <For each={spotifyStates}>
                  {(state) => (
                    <button
                      type="button"
                      onClick={() => setSpotifyState(state)}
                      aria-pressed={spotifyState() === state}
                      class={`rounded-md px-2 py-2 font-mono text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 motion-reduce:transition-none ${
                        spotifyState() === state
                          ? state === "limited"
                            ? "bg-rose-300 text-slate-950"
                            : "bg-emerald-300 text-slate-950"
                          : "text-slate-500 hover:bg-slate-800/75 hover:text-slate-300"
                      }`}
                    >
                      {text().states[state]}
                    </button>
                  )}
                </For>
              </div>
            </fieldset>

            <div class="grid min-h-32 place-items-center" aria-hidden="true">
              <div
                class={`grid size-28 place-items-center rounded-full border border-slate-100/10 bg-[repeating-radial-gradient(circle,#151a20_0,#151a20_3px,#080b10_4px,#080b10_8px)] shadow-xl ${
                  spotifyState() === "playing"
                    ? "animate-[spin_5s_linear_infinite] shadow-emerald-500/15 motion-reduce:animate-none"
                    : spotifyState() === "limited"
                      ? "shadow-rose-500/15"
                      : "shadow-slate-950/50"
                }`}
              >
                <div
                  class={`grid size-14 place-items-center rounded-full border-4 border-[#080b10] font-mono text-[11px] font-semibold text-slate-950 ${
                    spotifyState() === "limited" ? "bg-rose-300" : "bg-emerald-300"
                  }`}
                >
                  {spotifyDelay[spotifyState()]}
                </div>
              </div>
            </div>

            <div
              class={`rounded-xl border px-3 py-2.5 ${
                spotifyState() === "limited"
                  ? "border-rose-300/20 bg-rose-300/8"
                  : "border-emerald-300/15 bg-emerald-300/6"
              }`}
              aria-live="polite"
            >
              <div class="flex items-baseline justify-between gap-3">
                <span class="font-mono text-[9px] tracking-[0.12em] text-slate-400 uppercase">
                  {text().nextRequest}
                </span>
                <strong
                  class={`font-mono text-sm ${
                    spotifyState() === "limited" ? "text-rose-200" : "text-emerald-200"
                  }`}
                >
                  {spotifyDelay[spotifyState()]}
                </strong>
              </div>
              <p class="mt-1 text-[10px] leading-relaxed text-slate-300">
                {text().spotifyReasons[spotifyState()]}
              </p>
            </div>

            <dl class="mt-auto grid gap-2 border-t border-slate-200/8 pt-3 text-[10px]">
              <div>
                <dt class="font-mono text-[9px] tracking-[0.12em] text-slate-500 uppercase">
                  {text().storage}
                </dt>
                <dd class="mt-0.5 text-slate-300">{text().memory}</dd>
                <dd class="text-slate-500">{text().memoryDetail}</dd>
              </div>
              <div>
                <dt class="font-mono text-[9px] tracking-[0.12em] text-slate-500 uppercase">
                  {text().boundary}
                </dt>
                <dd class="mt-0.5 text-slate-300">{text().spotifyBoundary}</dd>
              </div>
            </dl>
          </article>

          <article class="relative flex min-w-0 flex-col gap-4 p-4">
            <div class="pointer-events-none absolute top-0 right-0 size-36 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_68%)]" />
            <div class="relative flex items-center justify-between">
              <h3 class="flex items-center gap-2 font-mono text-xs font-medium text-sky-100">
                <span class="size-2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.75)]" />
                {text().github}
              </h3>
              <code class="rounded-full border border-sky-200/10 bg-sky-300/5 px-2 py-1 text-[9px] text-sky-200/65">
                POST /graphql
              </code>
            </div>

            <label class="block" for="source-policy-cache-age">
              <span class="flex items-end justify-between gap-2">
                <span class="font-mono text-[9px] tracking-[0.12em] text-slate-400 uppercase">
                  {text().cacheAtRestart}
                </span>
                <output
                  for="source-policy-cache-age"
                  class={`font-mono text-xs ${cacheFresh() ? "text-sky-200" : "text-amber-200"}`}
                >
                  {cacheAge()} min
                </output>
              </span>
              <div class="relative mt-3 mb-1 h-2 rounded-full bg-slate-800" aria-hidden="true">
                <span
                  class={`absolute inset-y-0 left-0 rounded-full transition-[width,background-color] motion-reduce:transition-none ${
                    cacheFresh() ? "bg-sky-300" : "bg-amber-300"
                  }`}
                  style={{ width: cacheProgress() }}
                />
                <span class="absolute top-1/2 left-2/3 h-4 w-px -translate-y-1/2 bg-slate-100/55" />
              </div>
              <input
                id="source-policy-cache-age"
                type="range"
                min="0"
                max="45"
                value={cacheAge()}
                onInput={(event) => setCacheAge(event.currentTarget.valueAsNumber)}
                class="w-full accent-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              />
              <span
                class="flex justify-between font-mono text-[8px] text-slate-600"
                aria-hidden="true"
              >
                <span>0</span>
                <span class={cacheFresh() ? "text-sky-300/70" : "text-amber-300/70"}>
                  30 · {cacheFresh() ? text().freshUntil : text().expired}
                </span>
                <span>45</span>
              </span>
            </label>

            <fieldset>
              <legend class="mb-1.5 font-mono text-[9px] tracking-[0.12em] text-slate-400 uppercase">
                {text().apiResponse}
              </legend>
              <div class="grid grid-cols-2 gap-1 rounded-lg bg-slate-950/70 p-1">
                <For each={githubStates}>
                  {(state) => (
                    <button
                      type="button"
                      onClick={() => setGitHubState(state)}
                      aria-pressed={githubState() === state}
                      class={`rounded-md px-2 py-2 font-mono text-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 motion-reduce:transition-none ${
                        githubState() === state
                          ? state === "limited"
                            ? "bg-rose-300 text-slate-950"
                            : "bg-sky-300 text-slate-950"
                          : "text-slate-500 hover:bg-slate-800/75 hover:text-slate-300"
                      }`}
                    >
                      {text().states[state]}
                    </button>
                  )}
                </For>
              </div>
            </fieldset>

            <div
              class={`rounded-xl border px-3 py-2.5 ${githubDecision().tone}`}
              aria-live="polite"
            >
              <div class="flex items-baseline justify-between gap-3">
                <strong class="font-mono text-[11px] font-medium">{githubDecision().action}</strong>
                <span class="shrink-0 font-mono text-sm">↻ {githubDecision().delay}</span>
              </div>
              <p class="mt-1 text-[10px] leading-relaxed text-slate-300">
                {githubDecision().detail}
              </p>
            </div>

            <dl class="mt-auto grid gap-2 border-t border-slate-200/8 pt-3 text-[10px]">
              <div>
                <dt class="font-mono text-[9px] tracking-[0.12em] text-slate-500 uppercase">
                  {text().storage}
                </dt>
                <dd class="mt-0.5 text-slate-300">{text().disk}</dd>
                <dd class="text-slate-500">{text().diskDetail}</dd>
              </div>
              <div>
                <dt class="font-mono text-[9px] tracking-[0.12em] text-slate-500 uppercase">
                  {text().boundary}
                </dt>
                <dd class="mt-0.5 text-slate-300">{text().githubBoundary}</dd>
              </div>
            </dl>
          </article>
        </div>

        <footer class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-slate-200/10 bg-slate-950/45 px-3 py-3 text-center font-mono text-[10px] text-slate-400">
          <span class="rounded bg-slate-800/70 px-2 py-1 text-slate-300">{text().contract}</span>
          <span aria-hidden="true" class="text-slate-700">
            →
          </span>
          <span>{text().stream}</span>
          <span aria-hidden="true" class="text-slate-700">
            →
          </span>
          <span>{text().panel}</span>
        </footer>
      </div>
    </LabFrame>
  );
}
