import { PALETTE } from "@/constants/telemetry";

function hash(value: string) {
  let output = 0;
  for (let index = 0; index < value.length; index += 1) {
    output = (output << 5) - output + value.charCodeAt(index);
    output |= 0;
  }

  return Math.abs(output);
}

export function pickColor(id: string) {
  return PALETTE[hash(id) % PALETTE.length];
}

export function formatCursorPosition(x: number, y: number) {
  return `x:${Math.round(x)} y:${Math.round(y)}`;
}
