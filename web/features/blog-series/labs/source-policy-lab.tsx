import { For, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type SourcePolicyLabProps = { locale?: LabLocale };
type SpotifyState = "playing" | "idle" | "limited";

const copy = {
  "en-US": {
    label: "Independent source clocks",
    spotify: "Spotify",
    github: "GitHub",
    states: { playing: "playing", idle: "idle", limited: "429" },
    age: "cache age",
    cached: "cached",
    fetch: "GET now",
    rate: "429",
  },
  "pt-BR": {
    label: "Relógios independentes das fontes",
    spotify: "Spotify",
    github: "GitHub",
    states: { playing: "tocando", idle: "parado", limited: "429" },
    age: "idade do cache",
    cached: "em cache",
    fetch: "GET agora",
    rate: "429",
  },
} as const;

const spotifyStates: SpotifyState[] = ["playing", "idle", "limited"];

export function SourcePolicyLab(props: SourcePolicyLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [spotifyState, setSpotifyState] = createSignal<SpotifyState>("playing");
  const [cacheAge, setCacheAge] = createSignal(12);
  const [githubLimited, setGithubLimited] = createSignal(false);

  const spotifyDelay = createMemo(() => {
    if (spotifyState() === "playing") return "2.5 s";
    if (spotifyState() === "idle") return "15 s";
    return "42 s";
  });
  const cacheFresh = createMemo(() => cacheAge() < 30);
  const githubDelay = createMemo(() => {
    if (cacheFresh()) return `${30 - cacheAge()} min`;
    return githubLimited() ? "15 min" : "30 min";
  });

  function cycleSpotify() {
    const current = spotifyStates.indexOf(spotifyState());
    setSpotifyState(spotifyStates[(current + 1) % spotifyStates.length]!);
  }

  return (
    <LabFrame id="source-policy" label={text().label} class="mx-auto max-w-xl">
      <div class="grid overflow-hidden rounded-[2rem] border border-slate-200/10 bg-[#0b0b0e] sm:grid-cols-2">
        <div class="relative grid min-h-52 place-items-center overflow-hidden border-b border-slate-200/10 p-4 sm:border-r sm:border-b-0">
          <span class="absolute top-3 left-4 font-mono text-[9px] tracking-[0.18em] text-emerald-200/45 uppercase">
            {text().spotify}
          </span>
          <button
            type="button"
            onClick={cycleSpotify}
            aria-label={`${text().spotify}: ${text().states[spotifyState()]}`}
            class={`relative grid size-32 place-items-center rounded-full border border-slate-100/10 shadow-2xl transition ${
              spotifyState() === "limited" ? "shadow-rose-500/20" : "shadow-emerald-500/15"
            }`}
          >
            <span
              class={`absolute inset-0 rounded-full bg-[repeating-radial-gradient(circle,#18181b_0,#18181b_3px,#09090b_4px,#09090b_7px)] ${
                spotifyState() === "playing" ? "animate-spin" : ""
              }`}
              style={spotifyState() === "playing" ? "animation-duration:3s" : undefined}
              aria-hidden="true"
            />
            <span
              class={`relative z-10 grid size-12 place-items-center rounded-full font-mono text-[10px] ${
                spotifyState() === "limited"
                  ? "bg-rose-400 text-slate-950"
                  : "bg-emerald-300 text-slate-950"
              }`}
            >
              {spotifyDelay()}
            </span>
          </button>
          <span class="absolute bottom-3 font-mono text-[9px] text-slate-500">
            {text().states[spotifyState()]}
          </span>
        </div>

        <div class="relative flex min-h-52 flex-col justify-between p-4">
          <div class="flex items-center justify-between">
            <span class="font-mono text-[9px] tracking-[0.18em] text-blue-200/45 uppercase">
              {text().github}
            </span>
            <button
              type="button"
              onClick={() => setGithubLimited((value) => !value)}
              disabled={cacheFresh()}
              aria-pressed={githubLimited()}
              class={`rounded px-2 py-1 font-mono text-[9px] transition disabled:opacity-20 ${
                githubLimited() ? "bg-rose-300 text-slate-950" : "bg-slate-800 text-slate-400"
              }`}
            >
              {text().rate}
            </button>
          </div>

          <div class="grid grid-cols-10 gap-1" aria-hidden="true">
            <For each={Array.from({ length: 30 })}>
              {(_, index) => (
                <span
                  class={`aspect-square rounded-[2px] transition-colors ${
                    index() < cacheAge()
                      ? cacheFresh()
                        ? "bg-blue-300/65"
                        : "bg-amber-300/70"
                      : "bg-slate-800"
                  }`}
                />
              )}
            </For>
          </div>

          <label class="font-mono text-[9px] text-slate-500">
            <span class="flex items-center justify-between">
              <span>{text().age}</span>
              <output class="text-slate-300">{cacheAge()} min</output>
            </span>
            <input
              type="range"
              min="0"
              max="45"
              value={cacheAge()}
              onInput={(event) => setCacheAge(event.currentTarget.valueAsNumber)}
              class="mt-1 w-full accent-blue-400"
            />
          </label>

          <div class="flex items-center justify-between font-mono text-[10px]" aria-live="polite">
            <span class={cacheFresh() ? "text-blue-200" : "text-amber-200"}>
              {cacheFresh() ? text().cached : text().fetch}
            </span>
            <span class="text-slate-400">↻ {githubDelay()}</span>
          </div>
        </div>
      </div>
    </LabFrame>
  );
}
