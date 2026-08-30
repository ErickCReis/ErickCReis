import { PALETTE } from "@web/constants/telemetry";

export function pickCursorSlotColor(slot: number) {
  return PALETTE[Math.abs(slot) % PALETTE.length];
}

export function formatCursorPosition(x: number, y: number) {
  return `x:${Math.round(x)} y:${Math.round(y)}`;
}
