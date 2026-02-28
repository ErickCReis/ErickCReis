export type FloatingMotion = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
};

export type FloatingBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getFloatingBounds(width: number, height: number): FloatingBounds {
  const marginX = Math.min(180, Math.max(84, width * 0.12));
  const marginY = Math.min(160, Math.max(88, height * 0.15));

  return {
    minX: marginX,
    maxX: Math.max(marginX, width - marginX),
    minY: marginY,
    maxY: Math.max(marginY, height - marginY),
  };
}

export function createFloatingMotion(bounds: FloatingBounds): FloatingMotion {
  const angle = randomRange(0, Math.PI * 2);
  const speed = randomRange(8, 16);

  return {
    x: randomRange(bounds.minX, bounds.maxX),
    y: randomRange(bounds.minY, bounds.maxY),
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
  };
}
