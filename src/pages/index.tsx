import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publishCursor, subscribeCursor, type CursorPayload } from "@/lib/eden";
import { cn } from "@/lib/utils";
import { createRoot } from "react-dom/client";
import { Line, LineChart, ResponsiveContainer } from "recharts";
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

type TelemetryDetail = {
  label: string;
  value: string;
};

type TelemetryPoint = {
  point: number;
  value: number;
};

type TelemetryPanel = {
  id: string;
  title: string;
  tag: string;
  hint: string;
  current: string;
  trend: string;
  details: TelemetryDetail[];
  points: TelemetryPoint[];
  primaryColor: string;
};

const PALETTE = ["#61d1ff", "#9bc9ff", "#86ffe1", "#ffcf8d", "#d3b6ff", "#ff9faf"];
const MAX_POINTS = 84;

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

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

type FloatingMotion = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
};

type FloatingBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFloatingBounds(width: number, height: number): FloatingBounds {
  const marginX = Math.min(180, Math.max(84, width * 0.12));
  const marginY = Math.min(160, Math.max(88, height * 0.15));

  return {
    minX: marginX,
    maxX: Math.max(marginX, width - marginX),
    minY: marginY,
    maxY: Math.max(marginY, height - marginY),
  };
}

function createFloatingMotion(bounds: FloatingBounds): FloatingMotion {
  const angle = randomRange(0, Math.PI * 2);
  const speed = randomRange(8, 16);

  return {
    x: randomRange(bounds.minX, bounds.maxX),
    y: randomRange(bounds.minY, bounds.maxY),
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
  };
}

function appendPoint(values: number[], nextValue: number) {
  return [...values, nextValue].slice(-MAX_POINTS);
}

function createPanelPoints(values: number[]): TelemetryPoint[] {
  if (values.length === 0) {
    return [];
  }

  return values.slice(-MAX_POINTS).map((value, point) => ({
    point,
    value,
  }));
}

function getLatest(values: number[]) {
  return values[values.length - 1] ?? 0;
}

function getPrevious(values: number[]) {
  return values.length > 1 ? values[values.length - 2] : values[values.length - 1] ?? 0;
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getPeak(values: number[]) {
  return values.length > 0 ? Math.max(...values) : 0;
}

function formatCount(value: number) {
  return Math.round(value).toLocaleString();
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatLoad(value: number) {
  return value.toFixed(2);
}

function formatMemory(valueMb: number) {
  if (valueMb >= 1024) {
    return `${(valueMb / 1024).toFixed(2)} GB`;
  }

  return `${valueMb.toFixed(1)} MB`;
}

function formatUptime(minutes: number) {
  if (minutes < 60) {
    return `${Math.floor(minutes)}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${Math.floor(minutes % 60)}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatSigned(value: number, decimals: number, suffix = "") {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}${suffix}`;
}

function formatCursorPosition(x: number, y: number) {
  return `x:${Math.round(x)} y:${Math.round(y)}`;
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
    () => {
      const latestRequests = getLatest(series.requests);
      const previousRequests = getPrevious(series.requests);
      const latestWebSockets = getLatest(series.websockets);
      const latestSubscribers = getLatest(series.subscribers);
      const latestUptime = getLatest(series.uptimeMinutes);
      const previousUptime = getPrevious(series.uptimeMinutes);
      const latestCpu = getLatest(series.cpu);
      const previousCpu = getPrevious(series.cpu);
      const latestLoad1 = getLatest(series.load1);
      const latestLoad15 = getLatest(series.load15);
      const latestHeap = getLatest(series.heap);
      const previousHeap = getPrevious(series.heap);
      const latestRss = getLatest(series.rss);
      const latestHeapTotal = getLatest(series.heapTotal);
      const latestSystemMemory = getLatest(series.systemMemory);
      const previousSystemMemory = getPrevious(series.systemMemory);
      const heapUsagePercent = latestHeapTotal > 0 ? (latestHeap / latestHeapTotal) * 100 : 0;
      const headroom = Math.max(latestHeapTotal - latestHeap, 0);

      return [
        {
          id: "traffic",
          title: "Traffic",
          tag: "req/ws",
          hint: "Incoming load versus persistent channels",
          current: `${formatCount(latestRequests)} req`,
          trend: formatSigned(latestRequests - previousRequests, 0, " req"),
          details: [
            { label: "Sockets", value: formatCount(latestWebSockets) },
            { label: "Average", value: `${formatCount(getAverage(series.requests))} req` },
            { label: "Peak", value: `${formatCount(getPeak(series.requests))} req` },
          ],
          points: createPanelPoints(series.requests),
          primaryColor: "#8ec7ff",
        },
        {
          id: "presence",
          title: "Presence",
          tag: "subs/uptime",
          hint: "Audience continuity over session time",
          current: `${formatCount(latestSubscribers)} live`,
          trend: formatUptime(latestUptime),
          details: [
            { label: "Uptime", value: formatUptime(latestUptime) },
            { label: "Average", value: `${formatCount(getAverage(series.subscribers))} subs` },
            { label: "Drift", value: formatSigned(latestUptime - previousUptime, 1, "m") },
          ],
          points: createPanelPoints(series.subscribers),
          primaryColor: "#8edec9",
        },
        {
          id: "cpu",
          title: "Compute",
          tag: "cpu/load1",
          hint: "Core activity and short load pressure",
          current: formatPercent(latestCpu),
          trend: formatSigned(latestCpu - previousCpu, 1, "%"),
          details: [
            { label: "Load (1m)", value: formatLoad(latestLoad1) },
            { label: "Load (15m)", value: formatLoad(latestLoad15) },
            { label: "Average", value: formatPercent(getAverage(series.cpu)) },
          ],
          points: createPanelPoints(series.cpu),
          primaryColor: "#f1c18b",
        },
        {
          id: "memory",
          title: "Heap",
          tag: "heap/rss",
          hint: "Runtime allocation against resident memory",
          current: formatMemory(latestHeap),
          trend: formatSigned(latestHeap - previousHeap, 1, " MB"),
          details: [
            { label: "RSS", value: formatMemory(latestRss) },
            { label: "Average", value: formatMemory(getAverage(series.heap)) },
            { label: "Peak", value: formatMemory(getPeak(series.heap)) },
          ],
          points: createPanelPoints(series.heap),
          primaryColor: "#f0bc8d",
        },
        {
          id: "memory-total",
          title: "Capacity",
          tag: "heapT/heap",
          hint: "Allocated ceiling and remaining headroom",
          current: formatPercent(heapUsagePercent),
          trend: `${formatMemory(headroom)} free`,
          details: [
            { label: "Heap total", value: formatMemory(latestHeapTotal) },
            { label: "Headroom", value: formatMemory(headroom) },
            { label: "Peak usage", value: formatMemory(getPeak(series.heap)) },
          ],
          points: createPanelPoints(series.heapTotal),
          primaryColor: "#adc4e4",
        },
        {
          id: "system",
          title: "System",
          tag: "sys/load15",
          hint: "Host pressure across long windows",
          current: formatPercent(latestSystemMemory),
          trend: formatSigned(latestSystemMemory - previousSystemMemory, 1, "%"),
          details: [
            { label: "Load (15m)", value: formatLoad(latestLoad15) },
            { label: "Average", value: formatPercent(getAverage(series.systemMemory)) },
            { label: "Peak", value: formatPercent(getPeak(series.systemMemory)) },
          ],
          points: createPanelPoints(series.systemMemory),
          primaryColor: "#9ccfd2",
        },
      ];
    },
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

function TelemetryBackdrop({
  panels,
  onStatsHoverChange,
}: {
  panels: TelemetryPanel[];
  onStatsHoverChange?: (isHovering: boolean) => void;
}) {
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

function HomePage({ initialHistory }: { initialHistory: ServerStats[] }) {
  const { panels } = useServerPulse(initialHistory);
  const { selfId, cursors } = useCursorPresence();
  const [isStatsHovered, setIsStatsHovered] = useState(false);

  return (
    <>
      <TelemetryBackdrop panels={panels} onStatsHoverChange={setIsStatsHovered} />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 md:px-8">
        <div className="grid w-full gap-8 md:grid-cols-[1.3fr_0.7fr]">
          <section className="space-y-5">
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
          const position = formatCursorPosition(cursor.x, cursor.y);
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
              {!isStatsHovered ? (
                <span className="absolute top-1/2 left-3 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap font-mono text-[0.5rem] tracking-[0.08em] uppercase">
                  <span className="text-slate-300/60">
                    {cursor.id === selfId ? "you" : cursor.id.slice(0, 4)}
                  </span>
                  <span className="text-slate-100/84">{position}</span>
                </span>
              ) : null}
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
