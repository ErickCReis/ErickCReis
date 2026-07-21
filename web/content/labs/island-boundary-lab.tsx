import { For, Show, createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type IslandBoundaryLabProps = { locale?: Locale };
type Architecture = "island" | "client";
type Fault = "none" | "javascript" | "stream";

function getCopy(locale: Locale) {
  return {
    label: t(locale, "Island boundary failure lab"),
    architectures: { island: t(locale, "Astro + island"), client: t(locale, "client-owned") },
    faults: {
      none: t(locale, "healthy"),
      javascript: t(locale, "no JavaScript"),
      stream: t(locale, "no stream"),
    },
    document: t(locale, "article HTML"),
    content: t(locale, "Selected work · notes · contact"),
    island: t(locale, "Solid island"),
    live: t(locale, "telemetry · 2 visitors"),
    offline: t(locale, "telemetry · offline"),
    absent: t(locale, "island absent"),
    waiting: t(locale, "document waiting for JavaScript"),
    outcomes: {
      island: {
        none: t(locale, "The document and live layer are available."),
        javascript: t(locale, "The document survives; the island does not start."),
        stream: t(locale, "The document survives; the island reports offline."),
      },
      client: {
        none: t(locale, "JavaScript renders the document and live layer."),
        javascript: t(locale, "Nothing can render without JavaScript."),
        stream: t(locale, "The rendered document stays; live data stops."),
      },
    },
  };
}

const architectures: Architecture[] = ["island", "client"];
const faults: Fault[] = ["none", "javascript", "stream"];

export function IslandBoundaryLab(props: IslandBoundaryLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const [architecture, setArchitecture] = createSignal<Architecture>("island");
  const [fault, setFault] = createSignal<Fault>("none");

  const javascriptReady = createMemo(() => fault() !== "javascript");
  const documentReady = createMemo(() => architecture() === "island" || javascriptReady());
  const islandReady = createMemo(() => javascriptReady());
  const streamReady = createMemo(() => islandReady() && fault() !== "stream");
  const outcome = createMemo(() => text().outcomes[architecture()][fault()]);

  const architectureClass = (active: boolean) =>
    `border-b py-1 font-mono text-xs tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 motion-reduce:transition-none ${
      active
        ? "border-cyan-200 text-cyan-100"
        : "border-transparent text-slate-600 hover:text-slate-300"
    }`;

  const faultClass = (active: boolean) =>
    `group flex items-center gap-2 py-1 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 motion-reduce:transition-none ${
      active ? "text-slate-200" : "text-slate-600 hover:text-slate-300"
    }`;

  return (
    <section
      class="not-prose my-10 mx-auto max-w-xl"
      aria-label={text().label}
      data-concept-lab="island-boundary"
    >
      <div class="flex flex-col gap-5 border-t border-white/10 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div
          class="flex gap-4"
          role="group"
          aria-label={`${text().architectures.island} / ${text().architectures.client}`}
        >
          <For each={architectures}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setArchitecture(choice)}
                aria-pressed={architecture() === choice}
                class={architectureClass(architecture() === choice)}
              >
                {text().architectures[choice]}
              </button>
            )}
          </For>
        </div>

        <div
          class="flex flex-wrap gap-x-4 gap-y-1"
          role="group"
          aria-label={`${text().faults.none} / ${text().faults.javascript} / ${text().faults.stream}`}
        >
          <For each={faults}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setFault(choice)}
                aria-pressed={fault() === choice}
                class={faultClass(fault() === choice)}
              >
                <span
                  class={`size-1.5 border transition-colors motion-reduce:transition-none ${
                    fault() === choice
                      ? choice === "none"
                        ? "border-emerald-200 bg-emerald-200"
                        : "border-amber-200 bg-amber-200"
                      : "border-slate-700 group-hover:border-slate-500"
                  }`}
                  aria-hidden="true"
                />
                {text().faults[choice]}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="relative mt-9 px-2 py-4 sm:px-5">
        <Show when={architecture() === "client"}>
          <span
            class={`pointer-events-none absolute inset-0 border transition-colors motion-reduce:transition-none ${
              javascriptReady() ? "border-cyan-200/25" : "border-rose-200/20 border-dashed"
            }`}
            aria-hidden="true"
          />
          <span
            class="absolute -top-1 left-5 bg-slate-950 px-2 font-mono text-xs uppercase tracking-[0.2em] text-cyan-200/60"
            aria-hidden="true"
          >
            {text().architectures.client}
          </span>
        </Show>

        <div class="grid min-h-32 grid-cols-1 gap-8 sm:grid-cols-[minmax(0,1fr)_8.5rem] sm:items-center sm:gap-10">
          <div
            class={`min-w-0 transition-opacity motion-reduce:transition-none ${documentReady() ? "opacity-100" : "opacity-45"}`}
          >
            <div class="flex items-center gap-3">
              <span
                class={`h-px w-6 ${documentReady() ? "bg-emerald-200/70" : "bg-rose-200/60"}`}
                aria-hidden="true"
              />
              <p
                class={`font-mono text-xs ${documentReady() ? "text-emerald-200/70" : "text-rose-200/70"}`}
              >
                {text().document}
              </p>
            </div>

            <Show
              when={documentReady()}
              fallback={
                <p class="mt-5 max-w-52 text-sm leading-relaxed text-rose-200/70">
                  {text().waiting}
                </p>
              }
            >
              <p class="mt-5 font-serif text-lg leading-snug text-slate-200">{text().content}</p>
              <div class="mt-4 space-y-2" aria-hidden="true">
                <span class="block h-px w-full bg-slate-800" />
                <span class="block h-px w-3/5 bg-slate-800" />
              </div>
            </Show>
          </div>

          <div class="relative min-h-24 sm:min-h-28">
            <Show when={architecture() === "island"}>
              <span
                class={`absolute -inset-3 border transition-colors motion-reduce:transition-none sm:-inset-4 ${
                  islandReady() ? "border-cyan-200/30" : "border-slate-700/70 border-dashed"
                }`}
                aria-hidden="true"
              />
              <span
                class="absolute -left-1 -top-4 bg-slate-950 px-1 font-mono text-xs text-cyan-200/50 sm:-left-2 sm:-top-5"
                aria-hidden="true"
              >
                {text().island}
              </span>
            </Show>

            <div class="flex h-full min-h-24 flex-col justify-center sm:min-h-28">
              <Show
                when={islandReady()}
                fallback={
                  <div class="flex items-center gap-2 text-slate-600">
                    <span
                      class="block h-px w-5 border-t border-dashed border-slate-700"
                      aria-hidden="true"
                    />
                    <p class="font-mono text-xs">{text().absent}</p>
                  </div>
                }
              >
                <span
                  class={`mb-3 block size-2 ${streamReady() ? "bg-cyan-200" : "border border-amber-200/70"}`}
                  aria-hidden="true"
                />
                <p
                  class={`font-mono text-xs leading-relaxed ${streamReady() ? "text-slate-300" : "text-amber-200/70"}`}
                >
                  {streamReady() ? text().live : text().offline}
                </p>
              </Show>
            </div>
          </div>
        </div>
      </div>

      <output
        class="mt-6 block border-b border-white/10 pb-4 text-base leading-relaxed text-slate-400"
        aria-live="polite"
        aria-atomic="true"
      >
        {outcome()}
      </output>
    </section>
  );
}
