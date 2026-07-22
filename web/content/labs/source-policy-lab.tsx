import { createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type SourcePolicyLabProps = { locale?: Locale };
type SpotifyState = "playing" | "idle";
type GitHubState = "fresh" | "expired";

function getCopy(locale: Locale) {
  return {
    label: t(locale, "Spotify and GitHub source policy simulator"),
    spotify: t(locale, "Spotify"),
    github: t(locale, "GitHub"),
    playing: t(locale, "playing"),
    idle: t(locale, "idle"),
    fresh: t(locale, "fresh"),
    expired: t(locale, "expired"),
    cache: t(locale, "cache"),
    contract: t(locale, "one normalized snapshot → shared stream"),
  };
}

export function SourcePolicyLab(props: SourcePolicyLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const [spotifyState, setSpotifyState] = createSignal<SpotifyState>("playing");
  const [githubState, setGitHubState] = createSignal<GitHubState>("fresh");

  const choiceClass = (active: boolean, tone: "green" | "blue") =>
    `rounded-full px-3 py-1.5 font-mono text-xs font-semibold transition-colors motion-reduce:transition-none ${
      active
        ? tone === "green"
          ? "bg-emerald-300 text-emerald-950"
          : "bg-sky-300 text-sky-950"
        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
    }`;

  return (
    <section
      class="not-prose mx-auto my-10 max-w-xl"
      aria-label={text().label}
      data-concept-lab="source-policy"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-3xl bg-emerald-300/[0.07] p-4 sm:p-5">
          <div class="flex items-center justify-between gap-3">
            <span class="font-mono text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
              {text().spotify}
            </span>
            <div
              class="flex rounded-full bg-black/20 p-0.5"
              role="group"
              aria-label={text().spotify}
            >
              <button
                type="button"
                onClick={() => setSpotifyState("playing")}
                aria-pressed={spotifyState() === "playing"}
                class={choiceClass(spotifyState() === "playing", "green")}
              >
                {text().playing}
              </button>
              <button
                type="button"
                onClick={() => setSpotifyState("idle")}
                aria-pressed={spotifyState() === "idle"}
                class={choiceClass(spotifyState() === "idle", "green")}
              >
                {text().idle}
              </button>
            </div>
          </div>

          <div class="mt-8 flex items-end justify-between gap-4">
            <output
              class="font-mono text-4xl font-black tracking-[-0.08em] text-emerald-100"
              aria-live="polite"
            >
              {spotifyState() === "playing" ? "2.5s" : "15s"}
            </output>
            <div class="mb-1 flex h-8 items-end gap-1" aria-hidden="true">
              <span
                class={`w-1 rounded-full bg-emerald-300 ${spotifyState() === "playing" ? "h-3" : "h-1"}`}
              />
              <span
                class={`w-1 rounded-full bg-emerald-300 ${spotifyState() === "playing" ? "h-7" : "h-1"}`}
              />
              <span
                class={`w-1 rounded-full bg-emerald-300 ${spotifyState() === "playing" ? "h-5" : "h-1"}`}
              />
              <span
                class={`w-1 rounded-full bg-emerald-300 ${spotifyState() === "playing" ? "h-8" : "h-1"}`}
              />
              <span
                class={`w-1 rounded-full bg-emerald-300 ${spotifyState() === "playing" ? "h-4" : "h-1"}`}
              />
            </div>
          </div>
        </div>

        <div class="rounded-3xl bg-sky-300/[0.07] p-4 sm:p-5">
          <div class="flex items-center justify-between gap-3">
            <span class="font-mono text-xs font-bold uppercase tracking-[0.16em] text-sky-200">
              {text().github}
            </span>
            <div
              class="flex rounded-full bg-black/20 p-0.5"
              role="group"
              aria-label={text().github}
            >
              <button
                type="button"
                onClick={() => setGitHubState("fresh")}
                aria-pressed={githubState() === "fresh"}
                class={choiceClass(githubState() === "fresh", "blue")}
              >
                {text().fresh}
              </button>
              <button
                type="button"
                onClick={() => setGitHubState("expired")}
                aria-pressed={githubState() === "expired"}
                class={choiceClass(githubState() === "expired", "blue")}
              >
                {text().expired}
              </button>
            </div>
          </div>

          <div class="mt-8 flex items-end justify-between gap-4">
            <output
              class="font-mono text-4xl font-black uppercase tracking-[-0.08em] text-sky-100"
              aria-live="polite"
            >
              {githubState() === "fresh" ? text().cache : "API"}
            </output>
            <div class="relative mb-1 h-8 w-10" aria-hidden="true">
              <span class="absolute inset-x-0 bottom-0 h-5 rounded-md bg-sky-300/25" />
              <span class="absolute inset-x-1 bottom-1 h-5 rounded-md bg-sky-300/45" />
              <span
                class={`absolute inset-x-2 h-5 rounded-md bg-sky-300 transition-[bottom] motion-reduce:transition-none ${
                  githubState() === "fresh" ? "bottom-2" : "bottom-3"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      <div class="mx-auto grid w-2/3 grid-cols-[1fr_auto_1fr] items-start" aria-hidden="true">
        <span class="h-7 rounded-br-2xl border-b border-r border-emerald-300/50" />
        <span class="mt-6 h-2 w-2 rotate-45 bg-slate-100" />
        <span class="h-7 rounded-bl-2xl border-b border-l border-sky-300/50" />
      </div>
      <p class="mt-2 text-center font-mono text-xs font-semibold text-slate-400">
        {text().contract}
      </p>
    </section>
  );
}
