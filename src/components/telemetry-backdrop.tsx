import { clamp, createFloatingMotion, type FloatingMotion, getFloatingBounds } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  createResource,
  createSignal,
  For,
  Index,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import { getServerStatsHistory } from "@/lib/api";
import { useServerPulse } from "@/hooks/use-server-pulse";
import { Sparkline } from "@/components/sparkline";

type TelemetryBackdropProps = {
  onStatsHoverChange?: (isHovering: boolean) => void;
};

export function TelemetryBackdrop(props: TelemetryBackdropProps) {
  const [history] = createResource(getServerStatsHistory);
  const { panels } = useServerPulse(history);

  const [activePanelId, setActivePanelId] = createSignal<string | null>(null);
  const panelRefs: Record<string, HTMLElement | null> = {};
  const motionById: Record<string, FloatingMotion> = {};
  const hoveredPanelIds: Record<string, boolean> = {};
  let lastFrameAt: number | null = null;

  const emitHoverState = () => {
    props.onStatsHoverChange?.(Object.values(hoveredPanelIds).some(Boolean));
  };

  const syncPanels = () => {
    const panelIds = panels().map((panel) => panel.id);
    const bounds = getFloatingBounds(window.innerWidth, window.innerHeight);
    const nextMotion: Record<string, FloatingMotion> = {};

    for (const panelId of panelIds) {
      const previous = motionById[panelId];
      if (previous) {
        nextMotion[panelId] = {
          ...previous,
          x: clamp(previous.x, bounds.minX, bounds.maxX),
          y: clamp(previous.y, bounds.minY, bounds.maxY),
        };
      } else {
        nextMotion[panelId] = createFloatingMotion(bounds);
      }

      const panelElement = panelRefs[panelId];
      if (panelElement) {
        panelElement.style.left = `${nextMotion[panelId].x}px`;
        panelElement.style.top = `${nextMotion[panelId].y}px`;
      }
    }

    for (const key of Object.keys(motionById)) {
      delete motionById[key];
    }
    Object.assign(motionById, nextMotion);

    const nextHovered: Record<string, boolean> = {};
    for (const panelId of panelIds) {
      if (hoveredPanelIds[panelId]) {
        nextHovered[panelId] = true;
      }
    }

    for (const key of Object.keys(hoveredPanelIds)) {
      delete hoveredPanelIds[key];
    }
    Object.assign(hoveredPanelIds, nextHovered);

    emitHoverState();
  };

  const togglePanel = (panelId: string) => {
    setActivePanelId((previous) => (previous === panelId ? null : panelId));
  };

  const onPanelHoverStart = (panelId: string) => {
    if (hoveredPanelIds[panelId]) {
      return;
    }

    hoveredPanelIds[panelId] = true;
    props.onStatsHoverChange?.(true);
  };

  const onPanelHoverEnd = (panelId: string) => {
    if (!hoveredPanelIds[panelId]) {
      return;
    }

    hoveredPanelIds[panelId] = false;
    emitHoverState();
  };

  onMount(() => {
    syncPanels();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-telemetry-item='true']")) {
        return;
      }

      setActivePanelId(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePanelId(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    const panelSyncInterval = window.setInterval(syncPanels, 2500);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onCleanup(() => {
        window.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("keydown", onKeyDown);
        window.clearInterval(panelSyncInterval);
      });

      return;
    }

    const updateBounds = () => {
      const bounds = getFloatingBounds(window.innerWidth, window.innerHeight);
      for (const panelId of panels().map((panel) => panel.id)) {
        const current = motionById[panelId];
        if (!current) {
          continue;
        }

        current.x = clamp(current.x, bounds.minX, bounds.maxX);
        current.y = clamp(current.y, bounds.minY, bounds.maxY);

        const panelElement = panelRefs[panelId];
        if (panelElement) {
          panelElement.style.left = `${current.x}px`;
          panelElement.style.top = `${current.y}px`;
        }
      }
    };

    let frameId = 0;
    const tick = (now: number) => {
      const lastFrameAtValue = lastFrameAt ?? now;
      const elapsedSeconds = Math.min((now - lastFrameAtValue) / 1000, 0.05);
      lastFrameAt = now;
      const bounds = getFloatingBounds(window.innerWidth, window.innerHeight);

      for (const panelId of panels().map((panel) => panel.id)) {
        const current = motionById[panelId];
        const panelElement = panelRefs[panelId];
        if (!current || !panelElement) {
          continue;
        }

        const isHovered = hoveredPanelIds[panelId] === true;
        const isOpen = activePanelId() === panelId;
        if (isHovered || isOpen) {
          continue;
        }

        current.x += current.velocityX * elapsedSeconds;
        current.y += current.velocityY * elapsedSeconds;

        if (current.x <= bounds.minX) {
          current.x = bounds.minX;
          current.velocityX = Math.abs(current.velocityX);
        } else if (current.x >= bounds.maxX) {
          current.x = bounds.maxX;
          current.velocityX = -Math.abs(current.velocityX);
        }

        if (current.y <= bounds.minY) {
          current.y = bounds.minY;
          current.velocityY = Math.abs(current.velocityY);
        } else if (current.y >= bounds.maxY) {
          current.y = bounds.maxY;
          current.velocityY = -Math.abs(current.velocityY);
        }

        panelElement.style.left = `${current.x}px`;
        panelElement.style.top = `${current.y}px`;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    window.addEventListener("resize", updateBounds, { passive: true });

    onCleanup(() => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.clearInterval(panelSyncInterval);
      lastFrameAt = null;
    });
  });

  onCleanup(() => {
    props.onStatsHoverChange?.(false);
  });

  return (
    <div class="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(113,152,208,0.16),transparent_42%),radial-gradient(circle_at_78%_74%,rgba(120,184,173,0.15),transparent_44%)]" />

      <div class="relative hidden h-full w-full md:block">
        <Index each={panels()}>
          {(panel) => {
            const panelId = () => panel().id;
            const isOpen = () => activePanelId() === panelId();
            const colorStyle = () =>
              ({ "background-color": panel().primaryColor }) as JSX.CSSProperties;
            const fallbackPositionStyle = () => {
              const currentMotion = motionById[panelId()];
              return currentMotion
                ? ({
                    left: `${currentMotion.x}px`,
                    top: `${currentMotion.y}px`,
                  } as JSX.CSSProperties)
                : ({ left: "50%", top: "50%" } as JSX.CSSProperties);
            };

            return (
              <article
                data-telemetry-item="true"
                ref={(panelElement) => {
                  panelRefs[panelId()] = panelElement;
                }}
                onPointerEnter={() => onPanelHoverStart(panelId())}
                onPointerLeave={() => onPanelHoverEnd(panelId())}
                class={cn(
                  "pointer-events-auto group absolute -translate-x-1/2 -translate-y-1/2 will-change-[left,top]",
                  isOpen() ? "z-50" : "z-20 hover:z-30",
                )}
                style={fallbackPositionStyle()}
              >
                <button
                  type="button"
                  onClick={() => togglePanel(panelId())}
                  class={cn(
                    "relative flex items-center gap-2 rounded-full border border-transparent px-2 py-1 transition duration-200 hover:border-slate-200/20 hover:bg-slate-950/25",
                    isOpen() ? "border-slate-200/25 bg-slate-950/30" : "",
                  )}
                >
                  <span
                    class="size-1.5 rounded-full opacity-65 transition-opacity duration-200 group-hover:opacity-100"
                    style={colorStyle()}
                  />
                  <span class="font-mono text-[0.52rem] tracking-[0.14em] text-slate-200/45 uppercase transition-colors duration-200 group-hover:text-slate-200/80">
                    {panel().tag}
                  </span>
                  <span class="font-mono text-[0.6rem] tracking-[0.08em] text-slate-200/28 uppercase transition-colors duration-200 group-hover:text-slate-100/78">
                    {panel().current}
                  </span>
                </button>
                <div
                  class={cn(
                    "absolute z-20 min-w-[11rem] rounded-xl border border-slate-200/15 bg-slate-950/68 p-3 shadow-[0_10px_30px_rgba(3,8,16,0.28)] backdrop-blur-md transition duration-200 group-hover:translate-y-0 group-hover:opacity-100",
                    isOpen()
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-1 opacity-0",
                    "top-7 left-1/2 -translate-x-1/2",
                  )}
                >
                  <p class="font-mono text-[0.55rem] tracking-[0.14em] text-slate-300/70 uppercase">
                    {panel().title}
                  </p>
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

      <div class="pointer-events-auto absolute inset-x-4 bottom-6 flex flex-wrap justify-center gap-2 md:hidden">
        <Index each={panels().slice(0, 3)}>
          {(panel) => {
            const panelId = () => panel().id;
            const style = () => ({ color: panel().primaryColor }) as JSX.CSSProperties;
            const isOpen = () => activePanelId() === panelId();

            return (
              <button
                type="button"
                data-telemetry-item="true"
                onClick={() => togglePanel(panelId())}
                class={cn(
                  "flex items-center gap-2 rounded-full border border-slate-200/20 bg-slate-950/38 px-3 py-1.5 backdrop-blur-sm transition-colors duration-200",
                  isOpen() ? "border-slate-200/35 bg-slate-950/55" : "",
                )}
              >
                <span class="size-1.5 rounded-full opacity-85" style={style()} />
                <span class="font-mono text-[0.52rem] tracking-[0.12em] text-slate-200/72 uppercase">
                  {panel().tag}
                </span>
                <span class="font-mono text-[0.58rem] tracking-[0.08em] text-slate-100/86 uppercase">
                  {panel().current}
                </span>
              </button>
            );
          }}
        </Index>
      </div>

      <Show when={panels().find((panel) => panel.id === activePanelId())}>
        {(activeMobilePanel) => (
          <div
            data-telemetry-item="true"
            class="pointer-events-auto absolute inset-x-4 bottom-20 rounded-xl border border-slate-200/15 bg-slate-950/72 p-3 shadow-[0_10px_30px_rgba(3,8,16,0.28)] backdrop-blur-md md:hidden"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="font-mono text-[0.55rem] tracking-[0.14em] text-slate-300/72 uppercase">
                {activeMobilePanel().title}
              </p>
              <button
                type="button"
                onClick={() => setActivePanelId(null)}
                class="font-mono text-[0.5rem] tracking-[0.1em] text-slate-300/62 uppercase"
              >
                close
              </button>
            </div>
            <p class="mt-1 font-mono text-[0.62rem] tracking-[0.08em] text-slate-100/88 uppercase">
              {activeMobilePanel().trend}
            </p>
            <div class="mt-2 h-12 w-full opacity-75">
              <Sparkline
                points={activeMobilePanel().points}
                color={activeMobilePanel().primaryColor}
              />
            </div>
            <p class="mt-1 text-[0.59rem] leading-snug text-slate-300/56">
              {activeMobilePanel().hint}
            </p>
            <dl class="mt-2 flex flex-col gap-1">
              <For each={activeMobilePanel().details}>
                {(detail) => (
                  <div class="flex items-center justify-between gap-2 font-mono text-[0.5rem] tracking-[0.08em] uppercase">
                    <dt class="text-slate-300/60">{detail.label}</dt>
                    <dd class="m-0 text-slate-100/84">{detail.value}</dd>
                  </div>
                )}
              </For>
            </dl>
          </div>
        )}
      </Show>
    </div>
  );
}
