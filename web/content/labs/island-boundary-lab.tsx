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
        none: t(locale, "Document and live data ready."),
        javascript: t(locale, "Document stays; island stops."),
        stream: t(locale, "Document stays; island offline."),
      },
      client: {
        none: t(locale, "JavaScript rendered both layers."),
        javascript: t(locale, "Nothing renders."),
        stream: t(locale, "Document stays; live data stops."),
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

  return (
    <section
      class="not-prose my-10 mx-auto max-w-xl overflow-x-clip py-2"
      aria-label={text().label}
      data-concept-lab="island-boundary"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex rounded-lg bg-slate-900 p-1" role="group">
          <For each={architectures}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setArchitecture(choice)}
                aria-pressed={architecture() === choice}
                class={`rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 motion-reduce:transition-none ${
                  architecture() === choice
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {text().architectures[choice]}
              </button>
            )}
          </For>
        </div>

        <div class="flex flex-wrap gap-1" role="group">
          <For each={faults}>
            {(choice) => (
              <button
                type="button"
                onClick={() => setFault(choice)}
                aria-pressed={fault() === choice}
                class={`rounded-md px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 motion-reduce:transition-none ${
                  fault() === choice
                    ? choice === "none"
                      ? "bg-emerald-300 text-emerald-950"
                      : "bg-amber-300 text-amber-950"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {text().faults[choice]}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="relative mt-5 min-h-64 rounded-2xl bg-[#dce7ee] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] sm:p-5">
        <div class="flex items-center gap-1.5 px-1 pb-3" aria-hidden="true">
          <span class="size-2 rounded-full bg-slate-500/40" />
          <span class="size-2 rounded-full bg-slate-500/25" />
          <span class="size-2 rounded-full bg-slate-500/25" />
        </div>

        <div
          class={`relative min-h-48 overflow-hidden rounded-xl bg-[#f8fbfc] p-5 transition-opacity motion-reduce:transition-none sm:p-7 ${
            documentReady() ? "opacity-100" : "opacity-35"
          }`}
        >
          <Show
            when={documentReady()}
            fallback={
              <div class="grid min-h-32 place-items-center">
                <p class="max-w-48 text-center text-sm font-semibold text-slate-600">
                  {text().waiting}
                </p>
              </div>
            }
          >
            <div class="max-w-64">
              <p class="font-mono text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {text().document}
              </p>
              <p class="mt-4 text-lg font-bold leading-snug text-slate-950">{text().content}</p>
              <div class="mt-5 space-y-2" aria-hidden="true">
                <span class="block h-2 w-full rounded-full bg-slate-200" />
                <span class="block h-2 w-4/5 rounded-full bg-slate-200" />
                <span class="block h-2 w-2/5 rounded-full bg-slate-200" />
              </div>
            </div>
          </Show>

          <Show when={architecture() === "client"}>
            <span
              class={`pointer-events-none absolute inset-0 rounded-xl ring-2 ring-inset ${
                javascriptReady() ? "ring-sky-500" : "ring-rose-500/70"
              }`}
              aria-hidden="true"
            />
          </Show>
        </div>

        <Show when={architecture() === "island" || javascriptReady()}>
          <div
            class={`absolute bottom-1 right-1 w-36 rounded-xl p-3 shadow-lg transition-colors motion-reduce:transition-none sm:bottom-3 sm:right-3 ${
              architecture() === "island"
                ? "rotate-[-2deg] bg-sky-600 text-white ring-4 ring-[#dce7ee]"
                : "bg-slate-900 text-white"
            }`}
          >
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-sky-100">
              {text().island}
            </p>
            <Show
              when={islandReady()}
              fallback={<p class="mt-2 text-sm font-semibold text-sky-100">{text().absent}</p>}
            >
              <div class="mt-2 flex items-center gap-2">
                <span
                  class={`size-2 shrink-0 rounded-full ${
                    streamReady() ? "bg-emerald-300" : "bg-amber-300"
                  }`}
                  aria-hidden="true"
                />
                <p class="text-sm font-semibold leading-tight">
                  {streamReady() ? text().live : text().offline}
                </p>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      <output
        class="mt-3 block text-center text-sm font-semibold text-slate-300"
        aria-live="polite"
        aria-atomic="true"
      >
        {outcome()}
      </output>
    </section>
  );
}
