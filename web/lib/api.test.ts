import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { publishCursor, subscribeCursor } from "@web/lib/api";

const NativeWebSocket = globalThis.WebSocket;

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  binaryType: BinaryType = "blob";
  readyState = FakeWebSocket.CONNECTING;
  readonly sent: Uint8Array[] = [];
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  constructor(readonly url: string | URL) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
    if (!listener) return;

    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  send(data: ArrayBuffer) {
    this.sent.push(new Uint8Array(data.slice(0)));
  }

  close() {
    this.readyState = FakeWebSocket.CLOSING;
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.emit("open");
  }

  finishClose() {
    this.readyState = FakeWebSocket.CLOSED;
    this.emit("close");
  }

  private emit(type: string) {
    const event = new Event(type);
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === "function") {
        listener(event);
      } else {
        listener.handleEvent(event);
      }
    }
  }
}

describe("cursor WebSocket transport", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: FakeWebSocket,
    });
  });

  afterAll(() => {
    globalThis.WebSocket = NativeWebSocket;
  });

  it("replays the latest cursor frame when the socket opens", () => {
    const unsubscribe = subscribeCursor(() => undefined);
    const ws = FakeWebSocket.instances[0];

    expect(publishCursor(new Uint8Array([1, 2, 3]))).toBeFalse();
    expect(ws.sent).toHaveLength(0);

    ws.open();

    expect(ws.sent.map((frame) => [...frame])).toEqual([[1, 2, 3]]);
    unsubscribe();
  });

  it("ignores a delayed close event from a superseded socket", () => {
    const unsubscribeFirst = subscribeCursor(() => undefined);
    const first = FakeWebSocket.instances[0];
    unsubscribeFirst();

    const unsubscribeSecond = subscribeCursor(() => undefined);
    const second = FakeWebSocket.instances[1];
    second.open();
    first.finishClose();

    expect(publishCursor(new Uint8Array([4, 5, 6]))).toBeTrue();
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(second.sent.map((frame) => [...frame])).toEqual([[4, 5, 6]]);
    unsubscribeSecond();
  });
});
