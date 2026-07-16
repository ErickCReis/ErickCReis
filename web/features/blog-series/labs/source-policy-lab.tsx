import { For, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type SourcePolicyLabProps = { locale?: LabLocale };
type SpotifyState = "playing" | "idle" | "limited";
type GitHubState = "ready" | "limited";

const copy = {
  "en-US": {
    label: "Spotify and GitHub source policy simulator",
    spotify: "Spotify",
    github: "GitHub",
    states: {
      playing: "playing",
      idle: "idle",
      limited: "429",
      ready: "available",
    },
    cache: "cache age",
    next: "next",
    spotifyResults: {
      playing: "poll in 2.5s · keep 84 snapshots in memory",
      idle: "poll in 15s · publish an empty playback state",
      limited: "honor Retry-After · try again in 42s",
    },
    githubResults: {
      cache: "serve the disk cache · no API call",
      fetch: "cache expired · fetch a new 30-day window",
      limited: "rate limited · retry after reset (15 min fallback)",
    },
    contract: "both publish one normalized snapshot to the shared stream",
  },
  "pt-BR": {
    label: "Simulador das políticas de origem do Spotify e do GitHub",
    spotify: "Spotify",
    github: "GitHub",
    states: {
      playing: "tocando",
      idle: "parado",
      limited: "429",
      ready: "disponível",
    },
    cache: "idade do cache",
    next: "próximo passo",
    spotifyResults: {
      playing: "consultar em 2,5s · manter 84 retratos na memória",
      idle: "consultar em 15s · publicar reprodução vazia",
      limited: "respeitar Retry-After · tentar em 42s",
    },
    githubResults: {
      cache: "servir o cache em disco · sem chamada à API",
      fetch: "cache expirado · buscar outra janela de 30 dias",
      limited: "limite atingido · tentar após a renovação (padrão de 15 min)",
    },
    contract: "os dois publicam um retrato normalizado no fluxo compartilhado",
  },
} as const;

const spotifyStates: SpotifyState[] = ["playing", "idle", "limited"];
const githubStates: GitHubState[] = ["ready", "limited"];

export function SourcePolicyLab(props: SourcePolicyLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [spotifyState, setSpotifyState] = createSignal<SpotifyState>("playing");
  const [cacheAge, setCacheAge] = createSignal(12);
  const [githubState, setGitHubState] = createSignal<GitHubState>("ready");

  const cacheFresh = createMemo(() => cacheAge() < 30);
  const githubResult = createMemo(() => {
    if (cacheFresh()) return text().githubResults.cache;
    return githubState() === "limited" ? text().githubResults.limited : text().githubResults.fetch;
  });

  const choiceClass = (active: boolean, tone: "green" | "blue") =>
    `rounded-full px-2.5 py-1.5 font-mono text-[9px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${
      tone === "green" ? "focus-visible:outline-emerald-200" : "focus-visible:outline-sky-200"
    } ${
      active
        ? tone === "green"
          ? "bg-emerald-200 text-slate-950"
          : "bg-sky-200 text-slate-950"
        : "text-slate-500 hover:text-slate-200"
    }`;

  return (
    <LabFrame id="source-policy" label={text().label} class="mx-auto max-w-2xl">
      <div class="border-y border-white/10 py-4">
        <div class="grid gap-5 sm:grid-cols-2 sm:divide-x sm:divide-white/10">
          <div class="min-w-0 sm:pr-5">
            <p class="font-mono text-[10px] text-emerald-200">{text().spotify}</p>
            <div class="mt-3 flex gap-1" role="group" aria-label={text().spotify}>
              <For each={spotifyStates}>
                {(state) => (
                  <button
                    type="button"
                    onClick={() => setSpotifyState(state)}
                    aria-pressed={spotifyState() === state}
                    class={choiceClass(spotifyState() === state, "green")}
                  >
                    {text().states[state]}
                  </button>
                )}
              </For>
            </div>
            <output
              class="mt-4 block min-h-8 text-xs leading-relaxed text-slate-400"
              aria-live="polite"
            >
              {text().spotifyResults[spotifyState()]}
            </output>
          </div>

          <div class="min-w-0 sm:pl-5">
            <div class="flex items-center justify-between gap-3">
              <p class="font-mono text-[10px] text-sky-200">{text().github}</p>
              <div class="flex gap-1" role="group" aria-label={text().github}>
                <For each={githubStates}>
                  {(state) => (
                    <button
                      type="button"
                      onClick={() => setGitHubState(state)}
                      aria-pressed={githubState() === state}
                      class={choiceClass(githubState() === state, "blue")}
                    >
                      {state === "ready" ? text().states.ready : text().states.limited}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <label class="mt-3 flex items-center gap-2 font-mono text-[9px] text-slate-500">
              <span>{text().cache}</span>
              <input
                type="range"
                min="0"
                max="45"
                value={cacheAge()}
                onInput={(event) => setCacheAge(event.currentTarget.valueAsNumber)}
                class="min-w-16 flex-1 accent-sky-300"
              />
              <output class="w-10 text-right">{cacheAge()}m</output>
            </label>
            <output
              class="mt-4 block min-h-8 text-xs leading-relaxed text-slate-400"
              aria-live="polite"
            >
              {githubResult()}
            </output>
          </div>
        </div>

        <p class="mt-4 font-mono text-[9px] text-slate-600">
          {text().next}: {text().contract}
        </p>
      </div>
    </LabFrame>
  );
}
