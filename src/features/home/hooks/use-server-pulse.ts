import { MAX_POINTS } from "@/features/home/constants";
import type { MetricSeries, ServerStats, TelemetryPanel, TelemetryPoint } from "@/features/home/types";
import { subscribeServerStats } from "@/lib/eden";
import { useEffect, useMemo, useState } from "react";

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

export function useServerPulse(initialHistory: ServerStats[]) {
  const [series, setSeries] = useState<MetricSeries>(() => createSeriesFromHistory(initialHistory));

  useEffect(() => {
    const controller = new AbortController();

    void subscribeServerStats(
      (payload) => {
        setSeries((previous) => ({
          rss: appendPoint(previous.rss, payload.memoryRssMb),
          heap: appendPoint(previous.heap, payload.memoryHeapUsedMb),
          heapTotal: appendPoint(previous.heapTotal, payload.memoryHeapTotalMb),
          cpu: appendPoint(previous.cpu, payload.cpuUsagePercent),
          load1: appendPoint(previous.load1, payload.loadAverage[0]),
          load15: appendPoint(previous.load15, payload.loadAverage[2]),
          systemMemory: appendPoint(previous.systemMemory, payload.systemMemoryUsedPercent),
          requests: appendPoint(previous.requests, payload.pendingRequests),
          websockets: appendPoint(previous.websockets, payload.pendingWebSockets),
          subscribers: appendPoint(previous.subscribers, payload.cursorSubscribers),
          uptimeMinutes: appendPoint(previous.uptimeMinutes, payload.uptimeSeconds / 60),
        }));
      },
      controller.signal,
    ).catch((error) => {
      if (!controller.signal.aborted) {
        console.error(error);
      }
    });

    return () => {
      controller.abort();
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
