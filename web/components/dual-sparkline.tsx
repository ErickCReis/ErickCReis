import type { TelemetryPoint } from "@web/types/home";

type DualSparklineProps = {
  primaryPoints: TelemetryPoint[];
  secondaryPoints: TelemetryPoint[];
  primaryColor: string;
  secondaryColor: string;
  primaryMax: number;
  secondaryMax: number;
};

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 48;
const PADDING = 2;

function toPolyline(points: TelemetryPoint[], maxValue: number) {
  if (points.length === 0) return "";
  const safeMax = maxValue || 1;

  return points
    .map((pt, index) => {
      const x =
        points.length === 1
          ? VIEWBOX_WIDTH / 2
          : PADDING + (index / (points.length - 1)) * (VIEWBOX_WIDTH - PADDING * 2);
      const normalized = Math.max(0, Math.min(1, pt.value / safeMax));
      const y = VIEWBOX_HEIGHT - PADDING - normalized * (VIEWBOX_HEIGHT - PADDING * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function DualSparkline(props: DualSparklineProps) {
  return (
    <svg
      class="h-full w-full"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={props.secondaryColor}
        stroke-width="1.1"
        stroke-opacity={0.55}
        stroke-dasharray="2 1.5"
        points={toPolyline(props.secondaryPoints, props.secondaryMax)}
      />
      <polyline
        fill="none"
        stroke={props.primaryColor}
        stroke-width="1.45"
        points={toPolyline(props.primaryPoints, props.primaryMax)}
      />
    </svg>
  );
}
