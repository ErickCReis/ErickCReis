import { clamp, createFloatingMotion, type FloatingMotion, getFloatingBounds } from "@/features/home/lib/motion";
import type { TelemetryPanel } from "@/features/home/types";
import { cn } from "@/lib/utils";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

type TelemetryBackdropProps = {
  panels: TelemetryPanel[];
  onStatsHoverChange?: (isHovering: boolean) => void;
};

export function TelemetryBackdrop({ panels, onStatsHoverChange }: TelemetryBackdropProps) {
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const panelIdsKey = useMemo(() => panels.map((panel) => panel.id).join("|"), [panels]);
  const stablePanelIds = useMemo(() => panelIdsKey.split("|").filter(Boolean), [panelIdsKey]);
  const activeMobilePanel = panels.find((panel) => panel.id === activePanelId) ?? null;
  const panelRefs = useRef<Record<string, HTMLElement | null>>({});
  const motionByIdRef = useRef<Record<string, FloatingMotion>>({});
  const lastFrameAtRef = useRef<number | null>(null);
  const hoveredPanelIdsRef = useRef<Record<string, boolean>>({});
  const activePanelIdRef = useRef<string | null>(activePanelId);

  useEffect(() => {
    activePanelIdRef.current = activePanelId;
  }, [activePanelId]);

  useEffect(() => {
    const bounds = getFloatingBounds(window.innerWidth, window.innerHeight);

    motionByIdRef.current = stablePanelIds.reduce<Record<string, FloatingMotion>>((next, panelId) => {
      const previous = motionByIdRef.current[panelId];
      if (previous) {
        next[panelId] = {
          ...previous,
          x: clamp(previous.x, bounds.minX, bounds.maxX),
          y: clamp(previous.y, bounds.minY, bounds.maxY),
        };
      } else {
        next[panelId] = createFloatingMotion(bounds);
      }

      const panelElement = panelRefs.current[panelId];
      if (panelElement) {
        panelElement.style.left = `${next[panelId].x}px`;
        panelElement.style.top = `${next[panelId].y}px`;
      }

      return next;
    }, {});

    const nextHovered: Record<string, boolean> = {};
    for (const panelId of stablePanelIds) {
      if (hoveredPanelIdsRef.current[panelId]) {
        nextHovered[panelId] = true;
      }
    }

    hoveredPanelIdsRef.current = nextHovered;
    onStatsHoverChange?.(Object.values(nextHovered).some(Boolean));
  }, [onStatsHoverChange, stablePanelIds]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const updateBounds = () => {
      const bounds = getFloatingBounds(window.innerWidth, window.innerHeight);
      for (const panelId of stablePanelIds) {
        const current = motionByIdRef.current[panelId];
        if (!current) {
          continue;
        }

        current.x = clamp(current.x, bounds.minX, bounds.maxX);
        current.y = clamp(current.y, bounds.minY, bounds.maxY);

        const panelElement = panelRefs.current[panelId];
        if (panelElement) {
          panelElement.style.left = `${current.x}px`;
          panelElement.style.top = `${current.y}px`;
        }
      }
    };

    const tick = (now: number) => {
      const lastFrameAt = lastFrameAtRef.current ?? now;
      const elapsedSeconds = Math.min((now - lastFrameAt) / 1000, 0.05);
      lastFrameAtRef.current = now;
      const bounds = getFloatingBounds(window.innerWidth, window.innerHeight);

      for (const panelId of stablePanelIds) {
        const current = motionByIdRef.current[panelId];
        const panelElement = panelRefs.current[panelId];
        if (!current || !panelElement) {
          continue;
        }

        const isHovered = hoveredPanelIdsRef.current[panelId] === true;
        const isOpen = activePanelIdRef.current === panelId;
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

    let frameId = window.requestAnimationFrame(tick);
    window.addEventListener("resize", updateBounds, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateBounds);
      lastFrameAtRef.current = null;
    };
  }, [stablePanelIds]);

  useEffect(() => {
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

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const togglePanel = (panelId: string) => {
    setActivePanelId((previous) => (previous === panelId ? null : panelId));
  };

  const onPanelHoverStart = (panelId: string) => {
    if (hoveredPanelIdsRef.current[panelId]) {
      return;
    }

    hoveredPanelIdsRef.current[panelId] = true;
    onStatsHoverChange?.(true);
  };

  const onPanelHoverEnd = (panelId: string) => {
    if (!hoveredPanelIdsRef.current[panelId]) {
      return;
    }

    hoveredPanelIdsRef.current[panelId] = false;
    onStatsHoverChange?.(Object.values(hoveredPanelIdsRef.current).some(Boolean));
  };

  useEffect(() => {
    return () => {
      onStatsHoverChange?.(false);
    };
  }, [onStatsHoverChange]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(113,152,208,0.16),transparent_42%),radial-gradient(circle_at_78%_74%,rgba(120,184,173,0.15),transparent_44%)]" />

      <div className="relative hidden h-full w-full md:block">
        {panels.map((panel) => {
          const isOpen = activePanelId === panel.id;
          const colorStyle = { backgroundColor: panel.primaryColor } as CSSProperties;
          const currentMotion = motionByIdRef.current[panel.id];
          const fallbackPositionStyle = currentMotion
            ? ({ left: `${currentMotion.x}px`, top: `${currentMotion.y}px` } as CSSProperties)
            : ({ left: "50%", top: "50%" } as CSSProperties);

          return (
            <article
              key={panel.id}
              data-telemetry-item="true"
              ref={(panelElement) => {
                panelRefs.current[panel.id] = panelElement;
              }}
              onPointerEnter={() => onPanelHoverStart(panel.id)}
              onPointerLeave={() => onPanelHoverEnd(panel.id)}
              className={cn(
                "pointer-events-auto group absolute -translate-x-1/2 -translate-y-1/2 will-change-[left,top]",
                isOpen ? "z-50" : "z-20 hover:z-30",
              )}
              style={fallbackPositionStyle}
            >
              <button
                type="button"
                onClick={() => togglePanel(panel.id)}
                className={cn(
                  "relative flex items-center gap-2 rounded-full border border-transparent px-2 py-1 transition duration-200 hover:border-slate-200/20 hover:bg-slate-950/25",
                  isOpen ? "border-slate-200/25 bg-slate-950/30" : "",
                )}
              >
                <span
                  className="size-1.5 rounded-full opacity-65 transition-opacity duration-200 group-hover:opacity-100"
                  style={colorStyle}
                />
                <span className="font-mono text-[0.52rem] tracking-[0.14em] text-slate-200/45 uppercase transition-colors duration-200 group-hover:text-slate-200/80">
                  {panel.tag}
                </span>
                <span className="font-mono text-[0.6rem] tracking-[0.08em] text-slate-200/28 uppercase transition-colors duration-200 group-hover:text-slate-100/78">
                  {panel.current}
                </span>
              </button>
              <div
                className={cn(
                  "absolute z-20 min-w-[11rem] rounded-xl border border-slate-200/15 bg-slate-950/68 p-3 shadow-[0_10px_30px_rgba(3,8,16,0.28)] backdrop-blur-md transition duration-200 group-hover:translate-y-0 group-hover:opacity-100",
                  isOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-1 opacity-0",
                  "top-7 left-1/2 -translate-x-1/2",
                )}
              >
                <p className="font-mono text-[0.55rem] tracking-[0.14em] text-slate-300/70 uppercase">
                  {panel.title}
                </p>
                <p className="mt-1 font-mono text-[0.62rem] tracking-[0.08em] text-slate-100/88 uppercase">
                  {panel.trend}
                </p>
                <div className="mt-2 h-12 w-full opacity-75">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={panel.points} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
                      <Line
                        dataKey="value"
                        type="monotone"
                        stroke={panel.primaryColor}
                        strokeWidth={1.45}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-1 text-[0.59rem] leading-snug text-slate-300/56">{panel.hint}</p>
                <dl className="mt-2 flex flex-col gap-1">
                  {panel.details.map((detail) => (
                    <div
                      key={detail.label}
                      className="flex items-center justify-between gap-2 font-mono text-[0.5rem] tracking-[0.08em] uppercase"
                    >
                      <dt className="text-slate-300/60">{detail.label}</dt>
                      <dd className="m-0 text-slate-100/84">{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </article>
          );
        })}
      </div>

      <div className="pointer-events-auto absolute inset-x-4 bottom-6 flex flex-wrap justify-center gap-2 md:hidden">
        {panels.slice(0, 3).map((panel) => {
          const style = { color: panel.primaryColor } as CSSProperties;
          const isOpen = activePanelId === panel.id;

          return (
            <button
              type="button"
              data-telemetry-item="true"
              onClick={() => togglePanel(panel.id)}
              key={`mobile-${panel.id}`}
              className={cn(
                "flex items-center gap-2 rounded-full border border-slate-200/20 bg-slate-950/38 px-3 py-1.5 backdrop-blur-sm transition-colors duration-200",
                isOpen ? "border-slate-200/35 bg-slate-950/55" : "",
              )}
            >
              <span className="size-1.5 rounded-full opacity-85" style={style} />
              <span className="font-mono text-[0.52rem] tracking-[0.12em] text-slate-200/72 uppercase">
                {panel.tag}
              </span>
              <span className="font-mono text-[0.58rem] tracking-[0.08em] text-slate-100/86 uppercase">
                {panel.current}
              </span>
            </button>
          );
        })}
      </div>

      {activeMobilePanel ? (
        <div
          data-telemetry-item="true"
          className="pointer-events-auto absolute inset-x-4 bottom-20 rounded-xl border border-slate-200/15 bg-slate-950/72 p-3 shadow-[0_10px_30px_rgba(3,8,16,0.28)] backdrop-blur-md md:hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[0.55rem] tracking-[0.14em] text-slate-300/72 uppercase">
              {activeMobilePanel.title}
            </p>
            <button
              type="button"
              onClick={() => setActivePanelId(null)}
              className="font-mono text-[0.5rem] tracking-[0.1em] text-slate-300/62 uppercase"
            >
              close
            </button>
          </div>
          <p className="mt-1 font-mono text-[0.62rem] tracking-[0.08em] text-slate-100/88 uppercase">
            {activeMobilePanel.trend}
          </p>
          <div className="mt-2 h-12 w-full opacity-75">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activeMobilePanel.points}
                margin={{ top: 4, right: 2, left: 2, bottom: 2 }}
              >
                <Line
                  dataKey="value"
                  type="monotone"
                  stroke={activeMobilePanel.primaryColor}
                  strokeWidth={1.45}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[0.59rem] leading-snug text-slate-300/56">{activeMobilePanel.hint}</p>
          <dl className="mt-2 flex flex-col gap-1">
            {activeMobilePanel.details.map((detail) => (
              <div
                key={`mobile-detail-${detail.label}`}
                className="flex items-center justify-between gap-2 font-mono text-[0.5rem] tracking-[0.08em] uppercase"
              >
                <dt className="text-slate-300/60">{detail.label}</dt>
                <dd className="m-0 text-slate-100/84">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
