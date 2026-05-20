export const CURSOR_COORD_MAX = 0xfff;
export const CURSOR_MAX_SLOTS = 64;
export const CURSOR_CLIENT_MOVE_BYTES = 3;
export const CURSOR_SERVER_MOVE_BYTES = 4;
export const CURSOR_SERVER_CONTROL_BYTES = 1;

export const cursorServerOpcode = {
  move: 0,
  join: 1,
  leave: 2,
  control: 3,
} as const;

export type CursorServerOpcode = (typeof cursorServerOpcode)[keyof typeof cursorServerOpcode];

export type CursorViewport = {
  width: number;
  height: number;
};

export type CursorPoint = {
  x: number;
  y: number;
};

export type PackedCursorPosition = {
  x: number;
  y: number;
};

export type CursorServerFrame =
  | {
      type: "move";
      slot: number;
      position: PackedCursorPosition;
    }
  | {
      type: "join";
      slot: number;
    }
  | {
      type: "leave";
      slot: number;
    }
  | {
      type: "control";
      slot: number;
    };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function assertSlot(slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= CURSOR_MAX_SLOTS) {
    throw new RangeError(`Cursor slot must be an integer from 0 to ${CURSOR_MAX_SLOTS - 1}`);
  }
}

function assertByteLength(bytes: Uint8Array, expectedLength: number) {
  if (bytes.byteLength !== expectedLength) {
    throw new RangeError(`Expected ${expectedLength} cursor bytes, received ${bytes.byteLength}`);
  }
}

function toFiniteViewportSize(value: number) {
  return Number.isFinite(value) && value > 1 ? value - 1 : 1;
}

function toNormalizedCoordinate(value: number, size: number) {
  if (!Number.isFinite(value)) return 0;

  return clamp(
    Math.round((value / toFiniteViewportSize(size)) * CURSOR_COORD_MAX),
    0,
    CURSOR_COORD_MAX,
  );
}

export function packCursorPosition(point: CursorPoint, viewport: CursorViewport): Uint8Array {
  const x = toNormalizedCoordinate(point.x, viewport.width);
  const y = toNormalizedCoordinate(point.y, viewport.height);

  return new Uint8Array([x >> 4, ((x & 0x0f) << 4) | (y >> 8), y & 0xff]);
}

export function unpackCursorPosition(bytes: Uint8Array): PackedCursorPosition {
  assertByteLength(bytes, CURSOR_CLIENT_MOVE_BYTES);

  return {
    x: (bytes[0] << 4) | (bytes[1] >> 4),
    y: ((bytes[1] & 0x0f) << 8) | bytes[2],
  };
}

export function normalizedCursorToViewportPoint(
  position: PackedCursorPosition,
  viewport: CursorViewport,
): CursorPoint {
  return {
    x:
      (clamp(position.x, 0, CURSOR_COORD_MAX) / CURSOR_COORD_MAX) *
      toFiniteViewportSize(viewport.width),
    y:
      (clamp(position.y, 0, CURSOR_COORD_MAX) / CURSOR_COORD_MAX) *
      toFiniteViewportSize(viewport.height),
  };
}

export function encodeServerCursorMove(slot: number, packedPosition: Uint8Array): Uint8Array {
  assertSlot(slot);
  assertByteLength(packedPosition, CURSOR_CLIENT_MOVE_BYTES);

  return new Uint8Array([slot, packedPosition[0], packedPosition[1], packedPosition[2]]);
}

export function encodeServerCursorJoin(slot: number): Uint8Array {
  assertSlot(slot);

  return new Uint8Array([(cursorServerOpcode.join << 6) | slot]);
}

export function encodeServerCursorLeave(slot: number): Uint8Array {
  assertSlot(slot);

  return new Uint8Array([(cursorServerOpcode.leave << 6) | slot]);
}

export function decodeClientCursorMoveFrame(data: ArrayBuffer | Uint8Array): Uint8Array | null {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength !== CURSOR_CLIENT_MOVE_BYTES) return null;

  return new Uint8Array(bytes);
}

export function decodeServerCursorFrame(data: ArrayBuffer | Uint8Array): CursorServerFrame | null {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength < CURSOR_SERVER_CONTROL_BYTES) return null;

  const opcode = bytes[0] >> 6;
  const slot = bytes[0] & 0x3f;

  if (opcode === cursorServerOpcode.move) {
    if (bytes.byteLength !== CURSOR_SERVER_MOVE_BYTES) return null;

    return {
      type: "move",
      slot,
      position: unpackCursorPosition(bytes.subarray(1)),
    };
  }

  if (opcode === cursorServerOpcode.join) {
    if (bytes.byteLength !== CURSOR_SERVER_CONTROL_BYTES) return null;

    return { type: "join", slot };
  }

  if (opcode === cursorServerOpcode.leave) {
    if (bytes.byteLength !== CURSOR_SERVER_CONTROL_BYTES) return null;

    return { type: "leave", slot };
  }

  if (bytes.byteLength !== CURSOR_SERVER_CONTROL_BYTES) return null;

  return { type: "control", slot };
}

export function formatCursorSlot(slot: number) {
  return `u${slot.toString().padStart(2, "0")}`;
}

export function cursorBytesKey(bytes: Uint8Array) {
  return Array.from(bytes).join(":");
}
