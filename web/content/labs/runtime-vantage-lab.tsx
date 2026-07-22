import { For, createMemo, createSignal } from "solid-js";
import { resolveLocale, t, type Locale } from "virtual:translate";

type RuntimeVantageLabProps = { locale?: Locale };
type Scope = "process" | "cgroup" | "host" | "outside";

function getCopy(locale: Locale) {
  return {
    label: t(locale, "Runtime observer boundary lab"),
    position: t(locale, "observer position"),
    reading: t(locale, "reading"),
    cannotTell: t(locale, "cannot tell"),
    scopes: {
      process: t(locale, "process"),
      cgroup: t(locale, "cgroup"),
      host: t(locale, "host"),
      outside: t(locale, "outside"),
    },
    blind: {
      process: t(locale, "not total laptop CPU"),
      cgroup: t(locale, "not Bun heap or free host RAM"),
      host: t(locale, "only the hardware deliberately mounted"),
      outside: t(locale, "reachability, not the failing internal layer"),
    },
    reachable: t(locale, "reachable"),
  };
}

const scopes: Scope[] = ["process", "cgroup", "host", "outside"];

const visuals: Record<Scope, { value: string; accent: string; active: string; marker: string }> = {
  process: {
    value: "60%",
    accent: "text-cyan-300",
    active: "bg-cyan-300 text-slate-950",
    marker: "bg-cyan-300 shadow-[0_0_28px_rgba(103,232,249,0.55)]",
  },
  cgroup: {
    value: "62.5%",
    accent: "text-violet-300",
    active: "bg-violet-300 text-slate-950",
    marker: "bg-violet-300 shadow-[0_0_28px_rgba(196,181,253,0.55)]",
  },
  host: {
    value: "64%",
    accent: "text-amber-300",
    active: "bg-amber-300 text-slate-950",
    marker: "bg-amber-300 shadow-[0_0_28px_rgba(252,211,77,0.55)]",
  },
  outside: {
    value: "",
    accent: "text-emerald-300",
    active: "bg-emerald-300 text-slate-950",
    marker: "bg-emerald-300 shadow-[0_0_28px_rgba(110,231,183,0.55)]",
  },
};

export function RuntimeVantageLab(props: RuntimeVantageLabProps) {
  const text = createMemo(() => getCopy(resolveLocale(props.locale)));
  const [scope, setScope] = createSignal<Scope>("process");
  const visual = createMemo(() => visuals[scope()]);
  const value = createMemo(() => (scope() === "outside" ? text().reachable : visual().value));

  return (
    <section
      class="not-prose mx-auto my-10 max-w-2xl rounded-[1.75rem] bg-slate-950 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.35)] sm:p-6"
      aria-label={text().label}
      data-concept-lab="runtime-vantage"
    >
      <div
        class="grid grid-cols-4 gap-1 rounded-full bg-slate-900 p-1"
        role="group"
        aria-label={text().position}
      >
        <For each={scopes}>
          {(choice) => (
            <button
              type="button"
              onClick={() => setScope(choice)}
              aria-pressed={scope() === choice}
              class={`min-w-0 truncate rounded-full px-2 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none ${
                scope() === choice
                  ? visuals[choice].active
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {text().scopes[choice]}
            </button>
          )}
        </For>
      </div>

      <div class="grid items-center gap-5 py-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-7 sm:px-4">
        <div class="text-center sm:text-right">
          <p class="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            {text().reading}
          </p>
          <output
            class={`mt-2 block font-black leading-none ${
              scope() === "outside"
                ? "text-[clamp(2.25rem,7vw,3rem)] tracking-[-0.03em]"
                : "text-[clamp(2.5rem,9vw,4.5rem)] tracking-[-0.05em]"
            } ${visual().accent}`}
            aria-live="polite"
          >
            {value()}
          </output>
        </div>

        <div class="relative mx-auto flex size-20 items-center justify-center" aria-hidden="true">
          <span class={`absolute size-4 rounded-full ${visual().marker}`} />
          <span class="absolute size-11 rounded-full border border-white/20" />
          <span class="absolute size-20 rounded-full border border-dashed border-white/10" />
          <span class="absolute left-full h-px w-6 bg-gradient-to-r from-white/30 to-transparent sm:w-8" />
          <span class="absolute right-full h-px w-6 bg-gradient-to-l from-white/30 to-transparent sm:w-8" />
        </div>

        <div class="text-center sm:text-left">
          <p class="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            {text().cannotTell}
          </p>
          <p class="mt-2 text-lg font-bold leading-snug text-slate-100">{text().blind[scope()]}</p>
        </div>
      </div>
    </section>
  );
}
