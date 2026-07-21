import { For, createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type SourcePolicyLabProps = { locale?: Locale };
type SpotifyState = "playing" | "idle" | "limited";
type GitHubState = "ready" | "limited";
function getCopy(locale: Locale) {
  return {
    label: t(locale, "Spotify and GitHub source policy simulator"),
    spotify: t(locale, "Spotify"),
    github: t(locale, "GitHub"),
    states: {
      playing: t(locale, "playing"),
      idle: t(locale, "idle"),
      limited: t(locale, "429"),
      ready: t(locale, "available"),
    },
    cache: t(locale, "cache age"),
    next: t(locale, "next"),
    spotifyResults: {
      playing: t(locale, "poll in 2.5s · keep 84 snapshots in memory"),
      idle: t(locale, "poll in 15s · publish an empty playback state"),
      limited: t(locale, "honor Retry-After · try again in 42s"),
    },
    githubResults: {
      cache: t(locale, "serve the disk cache · no API call"),
      fetch: t(locale, "cache expired · fetch a new 30-day window"),
      limited: t(locale, "rate limited · retry after reset (15 min fallback)"),
    },
    contract: t(locale, "both publish one normalized snapshot to the shared stream"),
  };
}

const spotifyStates: SpotifyState[] = ["playing", "idle", "limited"];
const githubStates: GitHubState[] = ["ready", "limited"];

export function SourcePolicyLab(props: SourcePolicyLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const [spotifyState, setSpotifyState] = createSignal<SpotifyState>("playing");
  const [cacheAge, setCacheAge] = createSignal(12);
  const [githubState, setGitHubState] = createSignal<GitHubState>("ready");

  const cacheFresh = createMemo(() => cacheAge() < 30);
  const githubResult = createMemo(() => {
    if (cacheFresh()) return text().githubResults.cache;
    return githubState() === "limited" ? text().githubResults.limited : text().githubResults.fetch;
  });

  const choiceClass = (active: boolean, tone: "green" | "blue") =>
    `border-b py-1 font-mono text-[9px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none ${
      tone === "green" ? "focus-visible:outline-emerald-200" : "focus-visible:outline-sky-200"
    } ${
      active
        ? tone === "green"
          ? "border-emerald-300 text-emerald-100"
          : "border-sky-300 text-sky-100"
        : "border-transparent text-slate-600 hover:text-slate-300"
    }`;

  return (
    <section
      class="not-prose my-10 mx-auto max-w-2xl"
      aria-label={text().label}
      data-concept-lab="source-policy"
    >
      <div class="relative overflow-hidden border-l border-white/10 pl-4 sm:pl-6">
        <div class="absolute left-0 top-0 h-14 w-px bg-emerald-300" aria-hidden="true" />

        <div class="grid items-start gap-x-8 gap-y-3 sm:grid-cols-[8.5rem_1fr]">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-200">
              {text().spotify}
            </p>
            <div class="mt-2 flex flex-wrap gap-x-3" role="group" aria-label={text().spotify}>
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
          </div>

          <div class="min-w-0 pt-1">
            <div class="flex h-3 items-center gap-1" aria-hidden="true">
              <For each={[0, 1, 2, 3, 4, 5, 6]}>
                {(_, index) => (
                  <span
                    class={`h-px flex-1 ${
                      spotifyState() === "limited"
                        ? index() < 2
                          ? "bg-rose-300"
                          : "bg-white/5"
                        : spotifyState() === "idle"
                          ? index() === 0
                            ? "bg-emerald-300"
                            : "bg-white/5"
                          : index() % 2
                            ? "bg-emerald-300/30"
                            : "bg-emerald-300"
                    }`}
                  />
                )}
              </For>
            </div>
            <output
              class="mt-2 block min-h-5 text-xs leading-relaxed text-slate-300"
              aria-live="polite"
            >
              {text().spotifyResults[spotifyState()]}
            </output>
          </div>
        </div>

        <div class="my-6 h-px bg-white/10" aria-hidden="true" />

        <div class="absolute bottom-0 left-0 top-20 w-px bg-sky-300" aria-hidden="true" />
        <div class="grid items-start gap-x-8 gap-y-4 sm:grid-cols-[8.5rem_1fr]">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-sky-200">
              {text().github}
            </p>
            <div class="mt-2 flex gap-x-3" role="group" aria-label={text().github}>
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

          <div class="min-w-0">
            <label class="block font-mono text-[9px] text-slate-500">
              <span class="flex items-baseline justify-between gap-4">
                <span>{text().cache}</span>
                <output class={cacheFresh() ? "text-sky-200" : "text-amber-200"}>
                  {cacheAge()}m
                </output>
              </span>
              <span class="relative mt-2 block h-5">
                <span class="absolute inset-x-0 top-2 h-px bg-white/10" aria-hidden="true" />
                <span
                  class="absolute left-0 top-2 h-px bg-sky-300/60"
                  style={{ width: `${Math.min(cacheAge(), 30) / 0.45}%` }}
                  aria-hidden="true"
                />
                <span
                  class="absolute top-0 h-4 w-px bg-amber-300/70"
                  style={{ left: `${30 / 0.45}%` }}
                  aria-hidden="true"
                />
                <span
                  class="absolute top-0.5 -translate-x-1/2 font-mono text-[7px] text-slate-600"
                  style={{ left: `${30 / 0.45}%` }}
                  aria-hidden="true"
                >
                  30m
                </span>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={cacheAge()}
                  onInput={(event) => setCacheAge(event.currentTarget.valueAsNumber)}
                  class="absolute inset-x-0 top-0 h-5 w-full cursor-ew-resize opacity-0 focus-visible:opacity-100 focus-visible:accent-sky-300"
                />
                <span
                  class={`pointer-events-none absolute top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full border ${
                    cacheFresh() ? "border-sky-200 bg-sky-300" : "border-amber-200 bg-amber-300"
                  }`}
                  style={{ left: `${cacheAge() / 0.45}%` }}
                  aria-hidden="true"
                />
              </span>
            </label>
            <output
              class="mt-1 block min-h-5 text-xs leading-relaxed text-slate-300"
              aria-live="polite"
            >
              {githubResult()}
            </output>
          </div>
        </div>

        <div class="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3" aria-hidden="true">
          <span class="h-px bg-gradient-to-r from-emerald-300/10 to-emerald-300/70" />
          <span class="font-mono text-[9px] text-slate-600">+</span>
          <span class="h-px bg-gradient-to-l from-sky-300/10 to-sky-300/70" />
        </div>
        <p class="mt-2 text-center font-mono text-[9px] leading-relaxed text-slate-500">
          <span class="text-slate-700">{text().next} / </span>
          {text().contract}
        </p>
      </div>
    </section>
  );
}
