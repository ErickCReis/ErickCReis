import { For, createMemo, createSignal } from "solid-js";
import { LabFrame } from "@web/features/blog-series/components/lab-frame";
import { selectLabCopy, type LabLocale } from "@web/features/blog-series/types";

type IslandBoundaryLabProps = { locale?: LabLocale };
type Mode = "islands" | "spa";

const copy = {
  "en-US": {
    label: "Island failure simulator",
    modes: { islands: "islands", spa: "SPA" },
    js: "JS",
    stream: "stream",
    title: "Portfolio",
    nav: ["work", "notes", "contact"],
    body: "Static document",
    stats: "live stats",
    cursors: "cursors",
    unavailable: "offline",
  },
  "pt-BR": {
    label: "Simulador de falhas nas ilhas",
    modes: { islands: "ilhas", spa: "SPA" },
    js: "JS",
    stream: "fluxo",
    title: "Portfólio",
    nav: ["trabalho", "notas", "contato"],
    body: "Documento estático",
    stats: "stats ao vivo",
    cursors: "cursores",
    unavailable: "indisponível",
  },
} as const;

export function IslandBoundaryLab(props: IslandBoundaryLabProps) {
  const text = () => selectLabCopy(props.locale, copy);
  const [mode, setMode] = createSignal<Mode>("islands");
  const [javascript, setJavascript] = createSignal(true);
  const [stream, setStream] = createSignal(true);
  const documentVisible = createMemo(() => mode() === "islands" || javascript());
  const liveVisible = createMemo(() => javascript() && stream());

  return (
    <LabFrame id="island-boundary" label={text().label} class="mx-auto max-w-lg">
      <div class="overflow-hidden rounded-2xl border border-blue-200/15 bg-slate-950 shadow-2xl shadow-blue-950/20">
        <div class="flex h-9 items-center gap-2 border-b border-slate-200/10 bg-slate-900/80 px-3">
          <span class="size-2 rounded-full bg-rose-400/70" />
          <span class="size-2 rounded-full bg-amber-300/70" />
          <span class="size-2 rounded-full bg-emerald-300/70" />
          <span class="ml-2 flex-1 rounded-full bg-slate-950/70 px-3 py-1 font-mono text-[9px] text-slate-500">
            erickr.dev
          </span>
          <div class="flex rounded-md bg-slate-950/60 p-0.5" role="group" aria-label={text().label}>
            <For each={["islands", "spa"] as const}>
              {(choice) => (
                <button
                  type="button"
                  onClick={() => setMode(choice)}
                  aria-pressed={mode() === choice}
                  class={`rounded px-2 py-0.5 font-mono text-[9px] ${
                    mode() === choice ? "bg-blue-300 text-slate-950" : "text-slate-500"
                  }`}
                >
                  {text().modes[choice]}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="relative h-44 bg-[linear-gradient(135deg,rgba(30,41,59,0.35),rgba(2,6,23,0.8))] p-4">
          <div
            class={`transition duration-300 ${
              documentVisible() ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
            aria-hidden={!documentVisible()}
          >
            <div class="flex items-center justify-between">
              <strong class="font-serif text-lg text-slate-100">{text().title}</strong>
              <div class="flex gap-2 font-mono text-[9px] text-slate-500">
                <For each={text().nav}>{(item) => <span>{item}</span>}</For>
              </div>
            </div>
            <div class="mt-4 h-2 w-2/3 rounded bg-slate-300/20" />
            <div class="mt-2 h-2 w-1/2 rounded bg-slate-300/10" />
            <span class="mt-3 inline-block rounded bg-slate-200/10 px-2 py-1 font-mono text-[9px] text-slate-400">
              {text().body}
            </span>
          </div>

          <div
            class={`absolute right-4 bottom-4 grid w-36 grid-cols-2 gap-1.5 rounded-xl border p-2 transition duration-300 ${
              liveVisible()
                ? "border-blue-300/25 bg-blue-400/10 opacity-100"
                : "border-rose-300/20 bg-rose-400/5 opacity-45"
            }`}
            aria-live="polite"
          >
            <span class="rounded-md bg-slate-950/70 px-2 py-2 text-center font-mono text-[9px] text-blue-100">
              {liveVisible() ? text().stats : "—"}
            </span>
            <span class="rounded-md bg-slate-950/70 px-2 py-2 text-center font-mono text-[9px] text-violet-100">
              {liveVisible() ? text().cursors : "—"}
            </span>
          </div>

          {!documentVisible() ? (
            <span class="absolute inset-0 grid place-items-center font-mono text-xs text-rose-200/70">
              {text().unavailable}
            </span>
          ) : null}
        </div>

        <div class="flex items-center justify-center gap-2 border-t border-slate-200/10 bg-slate-900/55 p-2">
          <button
            type="button"
            onClick={() => setJavascript((value) => !value)}
            aria-pressed={javascript()}
            class={`rounded-full border px-3 py-1 font-mono text-xxs transition ${
              javascript()
                ? "border-blue-300/30 bg-blue-300/10 text-blue-100"
                : "border-rose-300/25 text-rose-200"
            }`}
          >
            {text().js} {javascript() ? "●" : "○"}
          </button>
          <button
            type="button"
            onClick={() => setStream((value) => !value)}
            aria-pressed={stream()}
            class={`rounded-full border px-3 py-1 font-mono text-xxs transition ${
              stream()
                ? "border-violet-300/30 bg-violet-300/10 text-violet-100"
                : "border-rose-300/25 text-rose-200"
            }`}
          >
            {text().stream} {stream() ? "●" : "○"}
          </button>
        </div>
      </div>
    </LabFrame>
  );
}
