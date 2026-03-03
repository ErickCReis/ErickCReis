import { clsx } from "clsx";
import { createContext, For, Show, useContext, type Accessor, type JSX } from "solid-js";
import type { TelemetryDetail } from "@web/types/home";

const PanelContext = createContext<{
  isActive: Accessor<boolean>;
  isPinned: Accessor<boolean>;
  primaryColor: string;
  onRelease: () => void;
}>();
const PanelRenderModeContext = createContext<Accessor<"trigger" | "content">>();

function usePanelContext() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("Panel compound components must be used inside PanelProvider");
  return ctx;
}

function useRenderMode() {
  return useContext(PanelRenderModeContext);
}

export function PanelProvider(props: {
  isActive: Accessor<boolean>;
  isPinned: Accessor<boolean>;
  primaryColor: string;
  onRelease: () => void;
  children: JSX.Element;
}) {
  return (
    <PanelContext.Provider
      value={{
        isActive: props.isActive,
        isPinned: props.isPinned,
        primaryColor: props.primaryColor,
        onRelease: props.onRelease,
      }}
    >
      {props.children}
    </PanelContext.Provider>
  );
}

export function PanelRenderModeProvider(props: {
  mode: "trigger" | "content";
  children: JSX.Element;
}) {
  return (
    <PanelRenderModeContext.Provider value={() => props.mode}>
      {props.children}
    </PanelRenderModeContext.Provider>
  );
}

export function PanelTrigger(props: { tag: string; current: string }) {
  const { isActive, primaryColor } = usePanelContext();
  const mode = useRenderMode();
  const colorStyle = `background-color:${primaryColor};`;

  return (
    <Show when={!mode || mode() === "trigger"}>
      <span
        class={clsx(
          "size-1.5 rounded-full transition-opacity duration-200",
          isActive() ? "opacity-100" : "opacity-65",
        )}
        style={colorStyle}
      />
      <span
        class={clsx(
          "font-mono text-[0.52rem] tracking-[0.14em] uppercase transition-colors duration-200",
          isActive() ? "text-slate-200/80" : "text-slate-200/45",
        )}
      >
        {props.tag}
      </span>
      <span
        class={clsx(
          "max-w-36 truncate text-left font-mono text-[0.6rem] tracking-[0.08em] uppercase transition-colors duration-200",
          isActive() ? "text-slate-100/78" : "text-slate-200/28",
        )}
      >
        {props.current}
      </span>
    </Show>
  );
}

export function PanelContent(props: { children: JSX.Element }) {
  const mode = useRenderMode();
  return <Show when={!mode || mode() === "content"}>{props.children}</Show>;
}

export function PanelHeader(props: { title: string; actionUrl?: string; actionLabel?: string }) {
  const { isPinned, onRelease } = usePanelContext();

  return (
    <div class="flex items-center justify-between gap-2">
      <p class="font-mono text-[0.55rem] tracking-[0.14em] text-slate-300/70 uppercase">
        {props.title}
      </p>
      <div class="flex items-center gap-1">
        <Show when={props.actionUrl} keyed>
          {(url) => (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              class="rounded-md border border-slate-200/20 px-2 py-0.5 font-mono text-[0.46rem] tracking-[0.1em] text-slate-200/72 uppercase transition-colors hover:text-slate-100"
            >
              {props.actionLabel ?? "Open"}
            </a>
          )}
        </Show>
        <Show when={isPinned()}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRelease();
            }}
            class="rounded-md border border-slate-200/20 px-2 py-0.5 font-mono text-[0.46rem] tracking-[0.1em] text-slate-200/72 uppercase transition-colors hover:text-slate-100"
          >
            Release
          </button>
        </Show>
      </div>
    </div>
  );
}

export function PanelSubtitle(props: { children: JSX.Element }) {
  return (
    <div class="mt-1 font-mono text-[0.62rem] tracking-[0.08em] text-slate-100/88 uppercase">
      {props.children}
    </div>
  );
}

export function PanelChart(props: { children: JSX.Element }) {
  return <div class="mt-2 h-12 w-full opacity-75">{props.children}</div>;
}

export function PanelFooter(props: { details: TelemetryDetail[] }) {
  return (
    <dl class="mt-2 flex flex-col gap-1">
      <For each={props.details}>
        {(detail) => (
          <div class="flex items-center justify-between gap-2 font-mono text-[0.5rem] tracking-[0.08em] uppercase">
            <dt class="text-slate-300/60">{detail.label}</dt>
            <dd class="m-0 text-slate-100/84">{detail.value}</dd>
          </div>
        )}
      </For>
    </dl>
  );
}
