import { Elysia } from "elysia";
import { websocket } from "elysia/websocket";
import {
  CURSOR_MAX_SLOTS,
  decodeClientCursorMoveFrame,
  encodeServerCursorJoin,
  encodeServerCursorLeave,
  encodeServerCursorMove,
} from "@shared/cursor";

const CURSOR_TOPIC = "cursors";

type CursorPeer = {
  slot: number;
  lastPosition: Uint8Array | null;
};

type CursorSocketSender = {
  send(data: Uint8Array, compress?: boolean): number;
};

function isBinaryCursorPayload(payload: unknown): payload is ArrayBuffer | Uint8Array {
  return payload instanceof ArrayBuffer || payload instanceof Uint8Array;
}

export function createLiveRoutes() {
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

  function releaseSlot(slot: number) {
    occupiedSlots.delete(slot);
  }

  function sendPeerSnapshot(ws: CursorSocketSender, selfId: string) {
    for (const [connectionId, peer] of peersByConnectionId) {
      if (connectionId === selfId) continue;

      ws.send(encodeServerCursorJoin(peer.slot), false);
      if (peer.lastPosition) {
        ws.send(encodeServerCursorMove(peer.slot, peer.lastPosition), false);
      }
    }
  }

  return new Elysia({ name: "live-routes" }).use(websocket()).ws("/live", {
    open(ws) {
      const slot = allocateSlot();
      if (slot === null) {
        ws.close(1013, "Cursor capacity reached");
        return;
      }

      peersByConnectionId.set(ws.id, { slot, lastPosition: null });
      ws.subscribe(CURSOR_TOPIC);
      sendPeerSnapshot(ws, ws.id);
      ws.publish(CURSOR_TOPIC, encodeServerCursorJoin(slot), false);
    },
    message(ws, payload) {
      const peer = peersByConnectionId.get(ws.id);
      if (!peer || !isBinaryCursorPayload(payload)) return;

      const packedPosition = decodeClientCursorMoveFrame(payload);
      if (!packedPosition) return;

      peer.lastPosition = packedPosition;
      ws.publish(CURSOR_TOPIC, encodeServerCursorMove(peer.slot, packedPosition), false);
    },
    close(ws) {
      const peer = peersByConnectionId.get(ws.id);
      peersByConnectionId.delete(ws.id);
      ws.unsubscribe(CURSOR_TOPIC);

      if (!peer) return;

      releaseSlot(peer.slot);
      ws.publish(CURSOR_TOPIC, encodeServerCursorLeave(peer.slot), false);
    },
  });
}

export const liveRoutes = createLiveRoutes();
