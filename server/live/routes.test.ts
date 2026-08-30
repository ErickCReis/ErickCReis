import { afterEach, describe, expect, it } from "bun:test";
import { createLiveRoutes } from "@server/live/routes";
import { CURSOR_MAX_SLOTS } from "@shared/cursor";

let app: ReturnType<typeof createLiveRoutes> | undefined;
const sockets = new Set<WebSocket>();

function socketUrl() {
  const port = app?.server?.port;
  if (!port) throw new Error("Live routes test server did not start");

  return `ws://127.0.0.1:${port}/live`;
}

function openSocket() {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(socketUrl());
    socket.binaryType = "arraybuffer";
    sockets.add(socket);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", () => reject(new Error("WebSocket failed to open")), {
      once: true,
    });
  });
}

function nextBinaryMessage(socket: WebSocket) {
  return new Promise<Uint8Array>((resolve, reject) => {
    socket.addEventListener(
      "message",
      (event) => {
        if (!(event.data instanceof ArrayBuffer)) {
          reject(new Error("Expected a binary WebSocket message"));
          return;
        }

        resolve(new Uint8Array(event.data));
      },
      { once: true },
    );
  });
}

function nextClose(socket: WebSocket) {
  return new Promise<CloseEvent>((resolve) => {
    socket.addEventListener("close", resolve, { once: true });
  });
}

afterEach(async () => {
  for (const socket of sockets) {
    socket.close();
  }
  sockets.clear();

  await app?.stop(true);
  app = undefined;
});

describe("cursor WebSocket lifecycle", () => {
  it("broadcasts join, movement, and leave frames", async () => {
    app = createLiveRoutes().listen(0);
    const observer = await openSocket();
    const joinMessage = nextBinaryMessage(observer);
    const sender = await openSocket();

    expect([...(await joinMessage)]).toEqual([0x41]);

    const movementMessage = nextBinaryMessage(observer);
    sender.send(new Uint8Array([0x12, 0x34, 0x56]));
    expect([...(await movementMessage)]).toEqual([0x01, 0x12, 0x34, 0x56]);

    const leaveMessage = nextBinaryMessage(observer);
    sender.close();
    expect([...(await leaveMessage)]).toEqual([0x81]);
  });

  it("closes the 65th connection and reuses a released slot", async () => {
    app = createLiveRoutes().listen(0);
    const connected = await Promise.all(
      Array.from({ length: CURSOR_MAX_SLOTS }, () => openSocket()),
    );
    const rejected = new WebSocket(socketUrl());
    sockets.add(rejected);

    const rejectedClose = await nextClose(rejected);
    expect(rejectedClose.code).toBe(1013);

    const firstClose = nextClose(connected[0]);
    connected[0].close();
    await firstClose;

    const replacement = await openSocket();
    expect(replacement.readyState).toBe(WebSocket.OPEN);
  });
});
