import { Elysia } from "elysia";
import type { ElysiaWS } from "elysia/ws";
import {
  CURSOR_MAX_SLOTS,
  decodeClientCursorMoveFrame,
  encodeServerCursorJoin,
  encodeServerCursorLeave,
  encodeServerCursorMove,
} from "@shared/cursor";

const CURSOR_TOPIC = "cursors";

type CursorPeer = {
  slot: number | null;
  lastPosition: Uint8Array | null;
};

const peersByConnectionId = new Map<string, CursorPeer>();
const occupiedSlots = new Set<number>();

function allocateSlot() {
  for (let slot = 0; slot < CURSOR_MAX_SLOTS; slot += 1) {
    if (!occupiedSlots.has(slot)) {
      occupiedSlots.add(slot);
      return slot;
    }
  }

  return null;
}

function releaseSlot(slot: number | null) {
  if (slot === null) return;

  occupiedSlots.delete(slot);
}

function sendPeerSnapshot(ws: ElysiaWS, selfId: string) {
  for (const [connectionId, peer] of peersByConnectionId) {
    if (connectionId === selfId || peer.slot === null) continue;

    ws.sendBinary(encodeServerCursorJoin(peer.slot), false);
    if (peer.lastPosition) {
      ws.sendBinary(encodeServerCursorMove(peer.slot, peer.lastPosition), false);
    }
  }
}

export const liveRoutes = new Elysia({ name: "live-routes" }).ws("/live", {
  open(ws) {
    const slot = allocateSlot();
    const peer: CursorPeer = {
      slot,
      lastPosition: null,
    };

    peersByConnectionId.set(ws.id, peer);
    ws.subscribe(CURSOR_TOPIC);
    sendPeerSnapshot(ws, ws.id);

    if (slot !== null) {
      ws.publishBinary(CURSOR_TOPIC, encodeServerCursorJoin(slot), false);
    }
  },
  message(ws, payload) {
    const peer = peersByConnectionId.get(ws.id);
    if (!peer || peer.slot === null) return;

    const packedPosition = decodeClientCursorMoveFrame(payload as ArrayBuffer | Uint8Array);
    if (!packedPosition) return;

    peer.lastPosition = packedPosition;
    ws.publishBinary(CURSOR_TOPIC, encodeServerCursorMove(peer.slot, packedPosition), false);
  },
  close(ws) {
    const peer = peersByConnectionId.get(ws.id);
    peersByConnectionId.delete(ws.id);
    ws.unsubscribe(CURSOR_TOPIC);

    if (!peer || peer.slot === null) return;

    releaseSlot(peer.slot);
    ws.publishBinary(CURSOR_TOPIC, encodeServerCursorLeave(peer.slot), false);
  },
});
