import { clsx } from "clsx";
import { createResource, createSignal, For, Index, onCleanup, onMount } from "solid-js";
import { getServerStatsHistory } from "@/lib/api";
import { useServerPulse } from "@/hooks/use-server-pulse";
import { Sparkline } from "@/components/sparkline";

type TelemetryBackdropProps = {
  onStatsHoverChange?: (isHovering: boolean) => void;
};

type PanelMotionSeed = {
  pathIndex: number;
  duration: number;
  startDistance: number;
  startedAt: number;
  path: string;
};

type PredefinedPath = {
  build: (width: number, height: number) => string;
};

function formatCoord(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

function point(width: number, height: number, x: number, y: number) {
  const isCompactViewport = width < 640;
  const paddingLeftX = isCompactViewport
    ? Math.max(38, Math.min(84, width * 0.15))
    : Math.min(540, Math.max(320, width * 0.32));
  const paddingRightX = isCompactViewport
    ? Math.max(20, Math.min(56, width * 0.1))
    : Math.min(150, Math.max(90, width * 0.1));
  const paddingY = isCompactViewport
    ? Math.max(56, Math.min(128, height * 0.16))
    : Math.min(220, Math.max(100, height * 0.18));
  const safeX = paddingLeftX + x * Math.max(width - paddingLeftX - paddingRightX, 0);
  const safeY = paddingY + y * Math.max(height - paddingY * 2, 0);
  const mobileBottomOffset = isCompactViewport ? Math.min(96, Math.max(24, height * 0.1)) : 0;
  const shiftedY = Math.min(height - paddingY, safeY + mobileBottomOffset);
  return `${formatCoord(safeX)} ${formatCoord(shiftedY)}`;
}

const PREDEFINED_LONG_PATHS: PredefinedPath[] = [
  {
    build: (width, height) =>
      `M ${point(width, height, 0.09, 0.33)} C ${point(width, height, 0.22, 0.02)}, ${point(width, height, 0.46, 0.08)}, ${point(width, height, 0.64, 0.24)} C ${point(width, height, 0.86, 0.44)}, ${point(width, height, 0.94, 0.12)}, ${point(width, height, 0.88, 0.52)} C ${point(width, height, 0.84, 0.82)}, ${point(width, height, 0.58, 0.96)}, ${point(width, height, 0.36, 0.78)} C ${point(width, height, 0.22, 0.66)}, ${point(width, height, 0.04, 0.94)}, ${point(width, height, 0.1, 0.56)} C ${point(width, height, 0.14, 0.42)}, ${point(width, height, 0.02, 0.44)}, ${point(width, height, 0.09, 0.33)}`,
  },
  {
    build: (width, height) =>
      `M ${point(width, height, 0.91, 0.22)} C ${point(width, height, 0.74, 0.02)}, ${point(width, height, 0.54, 0.14)}, ${point(width, height, 0.42, 0.3)} C ${point(width, height, 0.24, 0.54)}, ${point(width, height, 0.06, 0.3)}, ${point(width, height, 0.12, 0.66)} C ${point(width, height, 0.18, 0.94)}, ${point(width, height, 0.46, 0.9)}, ${point(width, height, 0.62, 0.76)} C ${point(width, height, 0.84, 0.56)}, ${point(width, height, 0.98, 0.86)}, ${point(width, height, 0.94, 0.48)} C ${point(width, height, 0.92, 0.34)}, ${point(width, height, 0.98, 0.34)}, ${point(width, height, 0.91, 0.22)}`,
  },
  {
    build: (width, height) =>
      `M ${point(width, height, 0.18, 0.12)} C ${point(width, height, 0.02, 0.18)}, ${point(width, height, 0.08, 0.42)}, ${point(width, height, 0.24, 0.5)} C ${point(width, height, 0.44, 0.6)}, ${point(width, height, 0.46, 0.26)}, ${point(width, height, 0.66, 0.34)} C ${point(width, height, 0.86, 0.42)}, ${point(width, height, 0.9, 0.76)}, ${point(width, height, 0.66, 0.86)} C ${point(width, height, 0.44, 0.96)}, ${point(width, height, 0.22, 0.74)}, ${point(width, height, 0.12, 0.6)} C ${point(width, height, 0.06, 0.5)}, ${point(width, height, 0.34, 0.02)}, ${point(width, height, 0.18, 0.12)}`,
  },
  {
    build: (width, height) =>
      `M ${point(width, height, 0.52, 0.06)} C ${point(width, height, 0.72, 0.08)}, ${point(width, height, 0.92, 0.26)}, ${point(width, height, 0.86, 0.46)} C ${point(width, height, 0.8, 0.66)}, ${point(width, height, 0.56, 0.52)}, ${point(width, height, 0.5, 0.74)} C ${point(width, height, 0.44, 0.94)}, ${point(width, height, 0.18, 0.9)}, ${point(width, height, 0.12, 0.7)} C ${point(width, height, 0.06, 0.46)}, ${point(width, height, 0.32, 0.34)}, ${point(width, height, 0.28, 0.18)} C ${point(width, height, 0.26, 0.08)}, ${point(width, height, 0.4, 0.02)}, ${point(width, height, 0.52, 0.06)}`,
  },
  {
    build: (width, height) =>
      `M ${point(width, height, 0.08, 0.8)} C ${point(width, height, 0.14, 0.58)}, ${point(width, height, 0.34, 0.38)}, ${point(width, height, 0.56, 0.46)} C ${point(width, height, 0.8, 0.54)}, ${point(width, height, 0.96, 0.42)}, ${point(width, height, 0.88, 0.22)} C ${point(width, height, 0.8, 0.02)}, ${point(width, height, 0.52, 0.1)}, ${point(width, height, 0.32, 0.26)} C ${point(width, height, 0.18, 0.38)}, ${point(width, height, 0.18, 0.62)}, ${point(width, height, 0.08, 0.8)}`,
  },
  {
    build: (width, height) =>
      `M ${point(width, height, 0.06, 0.5)} C ${point(width, height, 0.1, 0.24)}, ${point(width, height, 0.3, 0.16)}, ${point(width, height, 0.46, 0.24)} C ${point(width, height, 0.64, 0.34)}, ${point(width, height, 0.74, 0.14)}, ${point(width, height, 0.9, 0.24)} C ${point(width, height, 0.98, 0.3)}, ${point(width, height, 0.96, 0.52)}, ${point(width, height, 0.84, 0.6)} C ${point(width, height, 0.68, 0.7)}, ${point(width, height, 0.74, 0.9)}, ${point(width, height, 0.48, 0.9)} C ${point(width, height, 0.24, 0.9)}, ${point(width, height, 0.08, 0.74)}, ${point(width, height, 0.06, 0.5)}`,
  },
  {
    build: (width, height) =>
      `M ${point(width, height, 0.14, 0.32)} C ${point(width, height, 0.26, 0.04)}, ${point(width, height, 0.5, 0.2)}, ${point(width, height, 0.66, 0.12)} C ${point(width, height, 0.84, 0.04)}, ${point(width, height, 0.92, 0.26)}, ${point(width, height, 0.82, 0.44)} C ${point(width, height, 0.72, 0.62)}, ${point(width, height, 0.5, 0.52)}, ${point(width, height, 0.44, 0.74)} C ${point(width, height, 0.38, 0.94)}, ${point(width, height, 0.14, 0.96)}, ${point(width, height, 0.1, 0.72)} C ${point(width, height, 0.06, 0.52)}, ${point(width, height, 0.02, 0.48)}, ${point(width, height, 0.14, 0.32)}`,
  },
  {
    build: (width, height) =>
      `M ${point(width, height, 0.28, 0.1)} C ${point(width, height, 0.1, 0.14)}, ${point(width, height, 0.02, 0.34)}, ${point(width, height, 0.12, 0.54)} C ${point(width, height, 0.24, 0.8)}, ${point(width, height, 0.48, 0.74)}, ${point(width, height, 0.62, 0.58)} C ${point(width, height, 0.78, 0.4)}, ${point(width, height, 0.96, 0.56)}, ${point(width, height, 0.9, 0.76)} C ${point(width, height, 0.84, 0.96)}, ${point(width, height, 0.58, 0.98)}, ${point(width, height, 0.42, 0.86)} C ${point(width, height, 0.26, 0.74)}, ${point(width, height, 0.46, 0.02)}, ${point(width, height, 0.28, 0.1)}`,
  },
  {
    build: (width, height) =>
      `M ${point(width, height, 0.08, 0.22)} C ${point(width, height, 0.2, 0.06)}, ${point(width, height, 0.42, 0.08)}, ${point(width, height, 0.58, 0.2)} C ${point(width, height, 0.74, 0.32)}, ${point(width, height, 0.86, 0.22)}, ${point(width, height, 0.94, 0.36)} C ${point(width, height, 0.98, 0.44)}, ${point(width, height, 0.9, 0.6)}, ${point(width, height, 0.76, 0.64)} C ${point(width, height, 0.56, 0.7)}, ${point(width, height, 0.42, 0.56)}, ${point(width, height, 0.28, 0.72)} C ${point(width, height, 0.12, 0.9)}, ${point(width, height, 0.0, 0.44)}, ${point(width, height, 0.08, 0.22)}`,
  },
  {
    build: (width, height) =>
      `M ${point(width, height, 0.56, 0.06)} C ${point(width, height, 0.72, 0.12)}, ${point(width, height, 0.86, 0.3)}, ${point(width, height, 0.8, 0.46)} C ${point(width, height, 0.74, 0.62)}, ${point(width, height, 0.58, 0.58)}, ${point(width, height, 0.52, 0.74)} C ${point(width, height, 0.46, 0.9)}, ${point(width, height, 0.64, 0.98)}, ${point(width, height, 0.78, 0.88)} C ${point(width, height, 0.92, 0.78)}, ${point(width, height, 0.98, 0.54)}, ${point(width, height, 0.92, 0.34)} C ${point(width, height, 0.84, 0.06)}, ${point(width, height, 0.4, 0.02)}, ${point(width, height, 0.56, 0.06)}`,
  },
];

function createPanelPath(pathIndex: number, viewportWidth: number, viewportHeight: number): string {
  const width = Math.max(320, viewportWidth);
  const height = Math.max(420, viewportHeight);
  const selectedPath = PREDEFINED_LONG_PATHS[pathIndex] ?? PREDEFINED_LONG_PATHS[0];
  const rawPath = selectedPath.build(width, height).trim();
  return /z$/i.test(rawPath) ? rawPath : `${rawPath} Z`;
}

function getPanelStyle(motionSeed: PanelMotionSeed): string {
  return `--panel-float-duration:${motionSeed.duration.toFixed(2)}s;--panel-start-distance:${motionSeed.startDistance.toFixed(2)}%;offset-path:path('${motionSeed.path}');`;
}

function normalizeDistance(value: number) {
  return ((value % 100) + 100) % 100;
}

function getProgressDistance(motionSeed: PanelMotionSeed, now: number) {
  const elapsedSeconds = (now - motionSeed.startedAt) / 1000;
  return normalizeDistance(motionSeed.startDistance + (elapsedSeconds / motionSeed.duration) * 100);
}

function applyMotionStyle(element: HTMLElement, motionSeed: PanelMotionSeed) {
  element.style.setProperty("--panel-float-duration", `${motionSeed.duration.toFixed(2)}s`);
  element.style.setProperty("--panel-start-distance", `${motionSeed.startDistance.toFixed(2)}%`);
  element.style.setProperty("offset-path", `path('${motionSeed.path}')`);
}

export function TelemetryBackdrop(props: TelemetryBackdropProps) {
  const [history] = createResource(getServerStatsHistory);
  const { panels } = useServerPulse(history);

  const [viewportSize, setViewportSize] = createSignal({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [isPathDebugVisible, setIsPathDebugVisible] = createSignal(false);
  const [activePanelId, setActivePanelId] = createSignal<string | null>(null);
  const [manualPanelId, setManualPanelId] = createSignal<string | null>(null);
  const motionSeedById: Record<string, PanelMotionSeed> = {};
  const panelRefs: Record<string, HTMLElement | null> = {};

  const refreshMotionPaths = (width: number, height: number) => {
    const now = performance.now();
    for (const [panelId, motionSeed] of Object.entries(motionSeedById)) {
      motionSeed.startDistance = getProgressDistance(motionSeed, now);
      motionSeed.startedAt = now;
      motionSeed.path = createPanelPath(motionSeed.pathIndex, width, height);
      const panelElement = panelRefs[panelId];
      if (panelElement) {
        applyMotionStyle(panelElement, motionSeed);
      }
    }
  };

  const applyViewport = (width: number, height: number) => {
    refreshMotionPaths(width, height);
    setViewportSize({ width, height });
  };

  const getMotionSeed = (panelId: string): PanelMotionSeed => {
    const existing = motionSeedById[panelId];
    if (existing) {
      return existing;
    }

    const viewport = viewportSize();
    const pathIndex = Math.floor(Math.random() * PREDEFINED_LONG_PATHS.length);
    const nextSeed: PanelMotionSeed = {
      pathIndex,
      duration: 200 + Math.random() * 100,
      startDistance: Math.random() * 100,
      startedAt: performance.now(),
      path: createPanelPath(pathIndex, viewport.width, viewport.height),
    };
    motionSeedById[panelId] = nextSeed;
    return nextSeed;
  };

  const setActivePanel = (panelId: string | null) => {
    setActivePanelId(panelId);
    props.onStatsHoverChange?.(panelId !== null);
  };

  const onPanelHoverStart = (panelId: string) => {
    if (manualPanelId() !== null) {
      return;
    }
    setActivePanel(panelId);
  };

  const onPanelHoverEnd = (panelId: string) => {
    if (manualPanelId() !== null || activePanelId() !== panelId) {
      return;
    }
    setActivePanel(null);
  };

  const onPanelToggle = (panelId: string) => {
    if (manualPanelId() === panelId) {
      setManualPanelId(null);
      setActivePanel(null);
      return;
    }
    setManualPanelId(panelId);
    setActivePanel(panelId);
  };

  const clearManualPanel = () => {
    setManualPanelId(null);
    setActivePanel(null);
  };

  onMount(() => {
    let resizeTimeout = 0;

    const syncViewport = () => {
      applyViewport(window.innerWidth, window.innerHeight);
    };

    const onResize = () => {
      if (resizeTimeout !== 0) {
        window.clearTimeout(resizeTimeout);
      }

      resizeTimeout = window.setTimeout(() => {
        applyViewport(window.innerWidth, window.innerHeight);
        resizeTimeout = 0;
      }, 120);
    };

    syncViewport();

    window.addEventListener("resize", onResize, { passive: true });

    onCleanup(() => {
      window.removeEventListener("resize", onResize);
      if (resizeTimeout !== 0) {
        window.clearTimeout(resizeTimeout);
      }
    });
  });

  onCleanup(() => {
    props.onStatsHoverChange?.(false);
  });

  return (
    <div class="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(113,152,208,0.16),transparent_42%),radial-gradient(circle_at_78%_74%,rgba(120,184,173,0.15),transparent_44%)]" />
      <aside class="pointer-events-auto absolute right-0 bottom-5 z-70 translate-x-[calc(100%-0.6rem)] transition-transform duration-300 ease-out hover:translate-x-0 focus-within:translate-x-0">
        <div class="rounded-l-xl border border-slate-200/20 border-r-0 bg-slate-950/70 px-3 py-2 shadow-[0_8px_24px_rgba(3,8,16,0.34)] backdrop-blur-md">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 font-mono text-[0.58rem] tracking-[0.12em] text-slate-300/75 uppercase transition-colors duration-200 hover:text-slate-100 focus:text-slate-100"
            title="Toggle path debug"
            onClick={() => setIsPathDebugVisible((current) => !current)}
          >
            <span>Debug</span>
            <span
              class={clsx(
                "size-1.5 rounded-full border border-slate-200/35",
                isPathDebugVisible() ? "bg-emerald-300/90" : "bg-slate-500/35",
              )}
            />
          </button>
        </div>
      </aside>

      {isPathDebugVisible() ? (
        <svg
          class="pointer-events-none absolute inset-0 z-[65] h-full w-full"
          viewBox={`0 0 ${viewportSize().width} ${viewportSize().height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <For each={panels()}>
            {(panel) => {
              const motionSeed = getMotionSeed(panel.id);
              const debugPath = motionSeed.path;

              return (
                <path
                  d={debugPath}
                  fill="none"
                  stroke={panel.primaryColor}
                  stroke-opacity="0.45"
                  stroke-width="1.1"
                  stroke-dasharray="4 6"
                />
              );
            }}
          </For>
        </svg>
      ) : null}

      <div class="relative h-full w-full">
        <Index each={panels()}>
          {(panel) => {
            const panelId = panel().id;
            const colorStyle = `background-color:${panel().primaryColor};`;
            const motionSeed = getMotionSeed(panelId);
            const isActive = () => activePanelId() === panelId;
            const isPinned = () => manualPanelId() === panelId;

            return (
              <article
                data-telemetry-item="true"
                ref={(element) => {
                  panelRefs[panelId] = element;
                  if (element) {
                    applyMotionStyle(element, motionSeed);
                  }
                }}
                onPointerEnter={() => onPanelHoverStart(panelId)}
                onPointerLeave={() => onPanelHoverEnd(panelId)}
                class={clsx(
                  "telemetry-follow-path pointer-events-auto absolute [offset-anchor:50%_50%] [offset-distance:var(--panel-start-distance)] [offset-rotate:0deg] will-change-[offset-distance] motion-reduce:animate-none animate-[followPath_var(--panel-float-duration)_linear_infinite] z-20",
                  isActive()
                    ? "z-50 [animation-play-state:paused]"
                    : "hover:z-50 hover:[animation-play-state:paused]",
                )}
                style={getPanelStyle(motionSeed)}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPanelToggle(panelId);
                  }}
                  class={clsx(
                    "relative flex items-center gap-2 rounded-full border px-2 py-1 transition duration-200",
                    isActive()
                      ? "border-slate-200/25 bg-slate-950/42"
                      : "border-transparent hover:border-slate-200/25 hover:bg-slate-950/30",
                  )}
                  aria-pressed={isPinned()}
                >
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
                    {panel().tag}
                  </span>
                  <span
                    class={clsx(
                      "font-mono text-[0.6rem] tracking-[0.08em] uppercase transition-colors duration-200",
                      isActive() ? "text-slate-100/78" : "text-slate-200/28",
                    )}
                  >
                    {panel().current}
                  </span>
                </button>
                <div
                  class={clsx(
                    "absolute z-20 top-7 left-1/2 w-[min(82vw,14.5rem)] min-w-44 -translate-x-1/2 rounded-xl border border-slate-200/15 bg-slate-950/68 p-3 shadow-[0_10px_30px_rgba(3,8,16,0.28)] backdrop-blur-md transition duration-200",
                    isActive()
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-1 opacity-0",
                  )}
                  onPointerEnter={() => onPanelHoverStart(panelId)}
                  onPointerLeave={() => onPanelHoverEnd(panelId)}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="font-mono text-[0.55rem] tracking-[0.14em] text-slate-300/70 uppercase">
                      {panel().title}
                    </p>
                    {isPinned() ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearManualPanel();
                        }}
                        class="rounded-md border border-slate-200/20 px-2 py-0.5 font-mono text-[0.46rem] tracking-[0.1em] text-slate-200/72 uppercase transition-colors hover:text-slate-100"
                      >
                        Release
                      </button>
                    ) : null}
                  </div>
                  <p class="mt-1 font-mono text-[0.62rem] tracking-[0.08em] text-slate-100/88 uppercase">
                    {panel().trend}
                  </p>
                  <div class="mt-2 h-12 w-full opacity-75">
                    <Sparkline points={panel().points} color={panel().primaryColor} />
                  </div>
                  <p class="mt-1 text-[0.59rem] leading-snug text-slate-300/56">{panel().hint}</p>
                  <dl class="mt-2 flex flex-col gap-1">
                    <For each={panel().details}>
                      {(detail) => (
                        <div class="flex items-center justify-between gap-2 font-mono text-[0.5rem] tracking-[0.08em] uppercase">
                          <dt class="text-slate-300/60">{detail.label}</dt>
                          <dd class="m-0 text-slate-100/84">{detail.value}</dd>
                        </div>
                      )}
                    </For>
                  </dl>
                </div>
              </article>
            );
          }}
        </Index>
      </div>
    </div>
  );
}
