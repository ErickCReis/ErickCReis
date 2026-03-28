import type { WebSocketStat } from "@shared/stats/websocket";

export type WebSocketHistoryPoint = Pick<WebSocketStat, "timestamp" | "connectedUsers">;

export type WebSocketStatTuple = [number, number, number, number];
export type WebSocketHistoryPointTuple = [number, number];

export function serializeWebSocketStat(sample: WebSocketStat): WebSocketStatTuple {
  return [
    sample.timestamp,
    sample.connectedUsers,
    sample.maxConcurrentUsers,
    sample.connectionStartedAt,
  ];
}

export function deserializeWebSocketStat(tuple: WebSocketStatTuple): WebSocketStat {
  return {
    timestamp: tuple[0],
    connectedUsers: tuple[1],
    maxConcurrentUsers: tuple[2],
    connectionStartedAt: tuple[3],
  };
}

export function serializeWebSocketHistoryPoint(
  sample: WebSocketHistoryPoint,
): WebSocketHistoryPointTuple {
  return [sample.timestamp, sample.connectedUsers];
}

export function deserializeWebSocketHistoryPoint(
  tuple: WebSocketHistoryPointTuple,
): WebSocketHistoryPoint {
  return {
    timestamp: tuple[0],
    connectedUsers: tuple[1],
  };
}
