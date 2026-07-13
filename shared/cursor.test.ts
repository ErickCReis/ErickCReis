import { describe, expect, it } from "bun:test";
import {
  CURSOR_COORD_MAX,
  decodeClientCursorMoveFrame,
  decodeServerCursorFrame,
  encodeServerCursorJoin,
  encodeServerCursorLeave,
  encodeServerCursorMove,
  formatCursorSlot,
  normalizedCursorToViewportPoint,
  packCursorPosition,
  unpackCursorPosition,
} from "@shared/cursor";

describe("cursor binary transport", () => {
  it("packs min and max viewport positions into three bytes", () => {
    expect([...packCursorPosition({ x: 0, y: 0 }, { width: 1920, height: 1080 })]).toEqual([
      0, 0, 0,
    ]);
    expect([...packCursorPosition({ x: 1919, y: 1079 }, { width: 1920, height: 1080 })]).toEqual([
      0xff, 0xff, 0xff,
    ]);
  });

  it("round-trips normalized coordinates through the packed position bytes", () => {
    const packed = packCursorPosition({ x: 960, y: 540 }, { width: 1920, height: 1080 });
    const position = unpackCursorPosition(packed);

    expect(position.x).toBeGreaterThanOrEqual(2047);
    expect(position.x).toBeLessThanOrEqual(2049);
    expect(position.y).toBeGreaterThanOrEqual(2048);
    expect(position.y).toBeLessThanOrEqual(2050);
  });

  it("clamps out-of-bounds cursor points", () => {
    expect(
      unpackCursorPosition(packCursorPosition({ x: -20, y: -1 }, { width: 800, height: 600 })),
    ).toEqual({
      x: 0,
      y: 0,
    });
    expect(
      unpackCursorPosition(packCursorPosition({ x: 9999, y: 9999 }, { width: 800, height: 600 })),
    ).toEqual({
      x: CURSOR_COORD_MAX,
      y: CURSOR_COORD_MAX,
    });
  });

  it("converts normalized cursor positions back to receiver viewport pixels", () => {
    expect(
      normalizedCursorToViewportPoint(
        { x: CURSOR_COORD_MAX, y: CURSOR_COORD_MAX },
        { width: 320, height: 240 },
      ),
    ).toEqual({ x: 319, y: 239 });
  });

  it("encodes and decodes server movement frames with a two-bit opcode and six-bit slot", () => {
    const packed = new Uint8Array([0x12, 0x34, 0x56]);
    const frame = encodeServerCursorMove(7, packed);

    expect([...frame]).toEqual([0x07, 0x12, 0x34, 0x56]);
    expect(decodeServerCursorFrame(frame)).toEqual({
      type: "move",
      slot: 7,
      position: { x: 0x123, y: 0x456 },
    });
  });

  it("encodes and decodes join and leave control frames", () => {
    expect([...encodeServerCursorJoin(12)]).toEqual([0x4c]);
    expect([...encodeServerCursorLeave(12)]).toEqual([0x8c]);
    expect(decodeServerCursorFrame(new Uint8Array([0x4c]))).toEqual({ type: "join", slot: 12 });
    expect(decodeServerCursorFrame(new Uint8Array([0x8c]))).toEqual({ type: "leave", slot: 12 });
  });

  it("rejects malformed cursor frames", () => {
    expect(decodeClientCursorMoveFrame(new Uint8Array([1, 2]))).toBeNull();
    expect(decodeServerCursorFrame(new Uint8Array([]))).toBeNull();
    expect(decodeServerCursorFrame(new Uint8Array([0, 1, 2]))).toBeNull();
    expect(decodeServerCursorFrame(new Uint8Array([0x40, 1]))).toBeNull();
    expect(() => encodeServerCursorMove(64, new Uint8Array([1, 2, 3]))).toThrow(RangeError);
    expect(() => encodeServerCursorMove(0, new Uint8Array([1, 2]))).toThrow(RangeError);
  });

  it("formats public cursor slot labels", () => {
    expect(formatCursorSlot(0)).toBe("u00");
    expect(formatCursorSlot(7)).toBe("u07");
    expect(formatCursorSlot(63)).toBe("u63");
  });
});
