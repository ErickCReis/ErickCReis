import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publishCursor, subscribeCursor, type CursorPayload } from "@/lib/eden";
import { createRoot } from "react-dom/client";
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import "./site.css";

type ServerStats = {
  timestamp: string;
  uptimeSeconds: number;
  memoryRssMb: number;
  memoryHeapUsedMb: number;
  memoryHeapTotalMb: number;
  systemMemoryTotalMb: number;
  systemMemoryFreeMb: number;
  systemMemoryUsedPercent: number;
  cpuCount: number;
  cpuUsagePercent: number;
  loadAverage: [number, number, number];
  pendingRequests: number;
  pendingWebSockets: number;
  cursorSubscribers: number;
};

type StatsBootstrap = {
  history: ServerStats[];
};

type CursorState = CursorPayload & {
  updatedAt: number;
};

type MetricSeries = {
  rss: number[];
  heap: number[];
  heapTotal: number[];
  cpu: number[];
  load1: number[];
  load15: number[];
  systemMemory: number[];
  requests: number[];
  websockets: number[];
  subscribers: number[];
  uptimeMinutes: number[];
};

type TelemetryPanel = {
  id: string;
  tag: string;
  primaryPath: string;
  secondaryPath: string;
  primaryColor: string;
  secondaryColor: string;
};

const PALETTE = ["#61d1ff", "#9bc9ff", "#86ffe1", "#ffcf8d", "#d3b6ff", "#ff9faf"];
const MAX_POINTS = 84;
const SPARKLINE_WIDTH = 248;
const SPARKLINE_HEIGHT = 52;

function createEmptySeries(): MetricSeries {
  return {
    rss: [],
    heap: [],
    heapTotal: [],
    cpu: [],
    load1: [],
    load15: [],
    systemMemory: [],
    requests: [],
    websockets: [],
    subscribers: [],
    uptimeMinutes: [],
  };
}

function normalizeBootstrap(payload: unknown): StatsBootstrap {
  if (!payload || typeof payload !== "object" || !("history" in payload)) {
    return { history: [] };
  }

  const history = (payload as { history?: unknown }).history;
  if (!Array.isArray(history)) {
    return { history: [] };
  }

  const sanitizedHistory = history.filter((sample): sample is ServerStats => {
    if (!sample || typeof sample !== "object") {
      return false;
    }

    const candidate = sample as Partial<ServerStats>;
    return (
      typeof candidate.timestamp === "string" &&
      typeof candidate.uptimeSeconds === "number" &&
      typeof candidate.memoryRssMb === "number" &&
      typeof candidate.memoryHeapUsedMb === "number" &&
      typeof candidate.memoryHeapTotalMb === "number" &&
      typeof candidate.systemMemoryTotalMb === "number" &&
      typeof candidate.systemMemoryFreeMb === "number" &&
      typeof candidate.systemMemoryUsedPercent === "number" &&
      typeof candidate.cpuCount === "number" &&
      typeof candidate.cpuUsagePercent === "number" &&
      Array.isArray(candidate.loadAverage) &&
      typeof candidate.loadAverage[0] === "number" &&
      typeof candidate.loadAverage[1] === "number" &&
      typeof candidate.loadAverage[2] === "number" &&
      typeof candidate.pendingRequests === "number" &&
      typeof candidate.pendingWebSockets === "number" &&
      typeof candidate.cursorSubscribers === "number"
    );
  });

  return {
    history: sanitizedHistory.slice(-MAX_POINTS),
  };
}

function createStatsBootstrapResource() {
  let status: "pending" | "success" = "pending";
  let bootstrap: StatsBootstrap = { history: [] };

  const suspender = fetch("/api/stats/bootstrap", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      return (await response.json()) as unknown;
    })
    .then((payload) => {
      bootstrap = normalizeBootstrap(payload);
    })
    .catch(() => {
      bootstrap = { history: [] };
    })
    .finally(() => {
      status = "success";
    });

  return {
    read() {
      if (status === "pending") {
        throw suspender;
      }

      return bootstrap;
    },
  };
}

const statsBootstrapResource = createStatsBootstrapResource();

function createSeriesFromHistory(history: ServerStats[]) {
  const series = createEmptySeries();
  const historySlice = history.slice(-MAX_POINTS);

  for (const sample of historySlice) {
    if (typeof sample.memoryRssMb === "number") {
      series.rss.push(sample.memoryRssMb);
    }

    if (typeof sample.memoryHeapUsedMb === "number") {
      series.heap.push(sample.memoryHeapUsedMb);
    }

    if (typeof sample.memoryHeapTotalMb === "number") {
      series.heapTotal.push(sample.memoryHeapTotalMb);
    }

    if (typeof sample.cpuUsagePercent === "number") {
      series.cpu.push(sample.cpuUsagePercent);
    }

    if (Array.isArray(sample.loadAverage) && typeof sample.loadAverage[0] === "number") {
      series.load1.push(sample.loadAverage[0]);
    }

    if (Array.isArray(sample.loadAverage) && typeof sample.loadAverage[2] === "number") {
      series.load15.push(sample.loadAverage[2]);
    }

    if (typeof sample.systemMemoryUsedPercent === "number") {
      series.systemMemory.push(sample.systemMemoryUsedPercent);
    }

    if (typeof sample.pendingRequests === "number") {
      series.requests.push(sample.pendingRequests);
    }

    if (typeof sample.pendingWebSockets === "number") {
      series.websockets.push(sample.pendingWebSockets);
    }

    if (typeof sample.cursorSubscribers === "number") {
      series.subscribers.push(sample.cursorSubscribers);
    }

    if (typeof sample.uptimeSeconds === "number") {
      series.uptimeMinutes.push(sample.uptimeSeconds / 60);
    }
  }

  return series;
}

function hash(value: string) {
  let output = 0;
  for (let index = 0; index < value.length; index += 1) {
    output = (output << 5) - output + value.charCodeAt(index);
    output |= 0;
  }

  return Math.abs(output);
}

function pickColor(id: string) {
  return PALETTE[hash(id) % PALETTE.length];
}

function appendPoint(values: number[], nextValue: number) {
  return [...values, nextValue].slice(-MAX_POINTS);
}

function toPath(values: number[], width = 120, height = 34) {
  if (values.length === 0) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 2) - 1;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${Math.min(height - 1, Math.max(1, y)).toFixed(2)}`;
    })
    .join(" ");
}

function useServerPulse(initialHistory: ServerStats[]) {
  const [series, setSeries] = useState<MetricSeries>(() => createSeriesFromHistory(initialHistory));

  useEffect(() => {
    const source = new EventSource("/api/stats/stream");

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as Partial<ServerStats>;

        setSeries((previous) => ({
          rss:
            typeof payload.memoryRssMb === "number"
              ? appendPoint(previous.rss, payload.memoryRssMb)
              : previous.rss,
          heap:
            typeof payload.memoryHeapUsedMb === "number"
              ? appendPoint(previous.heap, payload.memoryHeapUsedMb)
              : previous.heap,
          heapTotal:
            typeof payload.memoryHeapTotalMb === "number"
              ? appendPoint(previous.heapTotal, payload.memoryHeapTotalMb)
              : previous.heapTotal,
          cpu:
            typeof payload.cpuUsagePercent === "number"
              ? appendPoint(previous.cpu, payload.cpuUsagePercent)
              : previous.cpu,
          load1:
            Array.isArray(payload.loadAverage) && typeof payload.loadAverage[0] === "number"
              ? appendPoint(previous.load1, payload.loadAverage[0])
              : previous.load1,
          load15:
            Array.isArray(payload.loadAverage) && typeof payload.loadAverage[2] === "number"
              ? appendPoint(previous.load15, payload.loadAverage[2])
              : previous.load15,
          systemMemory:
            typeof payload.systemMemoryUsedPercent === "number"
              ? appendPoint(previous.systemMemory, payload.systemMemoryUsedPercent)
              : previous.systemMemory,
          requests:
            typeof payload.pendingRequests === "number"
              ? appendPoint(previous.requests, payload.pendingRequests)
              : previous.requests,
          websockets:
            typeof payload.pendingWebSockets === "number"
              ? appendPoint(previous.websockets, payload.pendingWebSockets)
              : previous.websockets,
          subscribers:
            typeof payload.cursorSubscribers === "number"
              ? appendPoint(previous.subscribers, payload.cursorSubscribers)
              : previous.subscribers,
          uptimeMinutes:
            typeof payload.uptimeSeconds === "number"
              ? appendPoint(previous.uptimeMinutes, payload.uptimeSeconds / 60)
              : previous.uptimeMinutes,
        }));
      } catch {
        // Keep listening even if one packet is malformed.
      }
    };

    return () => {
      source.close();
    };
  }, []);

  const panels = useMemo<TelemetryPanel[]>(
    () => [
      {
        id: "traffic",
        tag: "req/ws",
        primaryPath: toPath(series.requests, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        secondaryPath: toPath(series.websockets, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        primaryColor: "#9ee6ff",
        secondaryColor: "#adc3ff",
      },
      {
        id: "presence",
        tag: "subs/uptime",
        primaryPath: toPath(series.subscribers, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        secondaryPath: toPath(series.uptimeMinutes, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        primaryColor: "#80ffd8",
        secondaryColor: "#b9ffe6",
      },
      {
        id: "cpu",
        tag: "cpu/load1",
        primaryPath: toPath(series.cpu, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        secondaryPath: toPath(series.load1, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        primaryColor: "#ffd79f",
        secondaryColor: "#ffd0f2",
      },
      {
        id: "memory",
        tag: "heap/rss",
        primaryPath: toPath(series.heap, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        secondaryPath: toPath(series.rss, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        primaryColor: "#ffc88f",
        secondaryColor: "#ffdcb8",
      },
      {
        id: "memory-total",
        tag: "heapT/heap",
        primaryPath: toPath(series.heapTotal, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        secondaryPath: toPath(series.heap, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        primaryColor: "#9fc2ff",
        secondaryColor: "#c2d5ff",
      },
      {
        id: "system",
        tag: "sys/load15",
        primaryPath: toPath(series.systemMemory, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        secondaryPath: toPath(series.load15, SPARKLINE_WIDTH, SPARKLINE_HEIGHT),
        primaryColor: "#8af7de",
        secondaryColor: "#9fd5ff",
      },
    ],
    [
      series.cpu,
      series.heap,
      series.heapTotal,
      series.load1,
      series.load15,
      series.requests,
      series.rss,
      series.subscribers,
      series.systemMemory,
      series.uptimeMinutes,
      series.websockets,
    ],
  );

  return { panels };
}

function useCursorPresence() {
  const [cursors, setCursors] = useState<Record<string, CursorState>>({});
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
  const frameScheduledRef = useRef(false);
  const selfIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
  );
  const selfColorRef = useRef(pickColor(selfIdRef.current));

  useEffect(() => {
    const selfId = selfIdRef.current;

    const unsubscribe = subscribeCursor((payload) => {
      setCursors((previous) => ({
        ...previous,
        [payload.id]: {
          id: payload.id,
          x: payload.x,
          y: payload.y,
          color: payload.color ?? pickColor(payload.id),
          updatedAt: Date.now(),
        },
      }));
    });

    const onPointerMove = (event: PointerEvent) => {
      pendingPointRef.current = { x: event.clientX, y: event.clientY };

      if (frameScheduledRef.current) {
        return;
      }

      frameScheduledRef.current = true;
      window.requestAnimationFrame(() => {
        frameScheduledRef.current = false;

        const point = pendingPointRef.current;
        if (!point) {
          return;
        }

        const payload: CursorPayload = {
          id: selfId,
          x: point.x,
          y: point.y,
          color: selfColorRef.current,
        };

        setCursors((previous) => ({
          ...previous,
          [selfId]: {
            ...payload,
            updatedAt: Date.now(),
          },
        }));
        publishCursor(payload);
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const staleInterval = window.setInterval(() => {
      const cutoff = Date.now() - 7000;
      setCursors((previous) =>
        Object.fromEntries(
          Object.entries(previous).filter(([, cursor]) => cursor.updatedAt >= cutoff),
        ),
      );
    }, 2200);

    return () => {
      unsubscribe();
      window.removeEventListener("pointermove", onPointerMove);
      window.clearInterval(staleInterval);
    };
  }, []);

  return {
    selfId: selfIdRef.current,
    cursors: Object.values(cursors),
  };
}

function TelemetryBackdrop({ panels }: { panels: TelemetryPanel[] }) {
  return (
    <div className="telemetry-backdrop" aria-hidden="true">
      <div className="telemetry-grid" />
      <div className="telemetry-glow telemetry-glow-left" />
      <div className="telemetry-glow telemetry-glow-right" />

      <div className="telemetry-panels">
        {panels.map((panel, index) => {
          const style = {
            "--panel-primary": panel.primaryColor,
            "--panel-secondary": panel.secondaryColor,
            animationDelay: `${index * 140}ms`,
          } as CSSProperties;

          return (
            <article
              key={panel.id}
              className={`telemetry-panel telemetry-panel-${index + 1}`}
              style={style}
            >
              <span className="telemetry-panel-tag">{panel.tag}</span>
              <svg
                viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                className="telemetry-graph"
                role="presentation"
              >
                <path
                  d={`M0 ${(SPARKLINE_HEIGHT / 2).toFixed(2)} L${SPARKLINE_WIDTH} ${(SPARKLINE_HEIGHT / 2).toFixed(2)}`}
                  className="telemetry-baseline"
                  strokeWidth="1"
                  fill="none"
                />
                <path
                  d={panel.secondaryPath}
                  className="telemetry-line telemetry-line-secondary"
                  strokeWidth="1.2"
                  fill="none"
                />
                <path
                  d={panel.primaryPath}
                  className="telemetry-line telemetry-line-primary"
                  strokeWidth="1.6"
                  fill="none"
                />
              </svg>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function HomePage({ initialHistory }: { initialHistory: ServerStats[] }) {
  const { panels } = useServerPulse(initialHistory);
  const { selfId, cursors } = useCursorPresence();

  return (
    <>
      <TelemetryBackdrop panels={panels} />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 md:px-8">
        <div className="grid w-full gap-8 md:grid-cols-[1.3fr_0.7fr]">
          <section className="space-y-5 reveal-up">
            <Badge
              variant="outline"
              className="rounded-full border-border/80 bg-card/40 px-3 py-1 font-mono tracking-[0.22em] uppercase"
            >
              live portfolio
            </Badge>
            <h1 className="font-serif text-5xl leading-[0.88] tracking-wide md:text-7xl">
              Erick C. Reis
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground md:text-base">
              TypeScript, React, Tailwind, shadcn/ui, Elysia, and Bun, with realtime cursor and
              telemetry overlays.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => (window.location.href = "/content")}>Content</Button>
              <Button
                variant="outline"
                onClick={() =>
                  window.open("https://github.com/erickreis", "_blank", "noopener,noreferrer")
                }
              >
                GitHub
              </Button>
            </div>
          </section>
        </div>
      </main>

      <div className="pointer-events-none fixed inset-0 z-40" aria-hidden="true">
        {cursors.map((cursor) => {
          const style = {
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            backgroundColor: cursor.color ?? pickColor(cursor.id),
            borderColor: cursor.color ?? pickColor(cursor.id),
          } as CSSProperties;

          return (
            <div
              key={cursor.id}
              className={`absolute -mt-1 -ml-1 size-2 rounded-full border shadow-[0_0_0_2px_rgba(8,11,18,0.64)] ${
                cursor.id === selfId ? "opacity-45" : ""
              }`}
              style={style}
            >
              <span
                className="absolute -top-1 left-3 font-mono text-[10px] tracking-[0.08em] uppercase"
                style={{ color: cursor.color ?? pickColor(cursor.id) }}
              >
                {cursor.id === selfId ? "you" : cursor.id.slice(0, 4)}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function HomePageLoader() {
  const bootstrap = statsBootstrapResource.read();
  return <HomePage initialHistory={bootstrap.history} />;
}

function HomePageFallback() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 md:px-8">
      <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
        loading telemetry
      </p>
    </main>
  );
}

const app = document.getElementById("app");
if (app) {
  createRoot(app).render(
    <Suspense fallback={<HomePageFallback />}>
      <HomePageLoader />
    </Suspense>,
  );
}
