import type { TelemetryPoint } from "@web/types/home";

type SparklineProps = {
  points: TelemetryPoint[];
  color: string;
};

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 48;
const PADDING = 2;

function toPolylinePoints(points: TelemetryPoint[]) {
  if (points.length === 0) {
    return "";
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  return values
    .map((value, index) => {
      const x =
        points.length === 1
          ? VIEWBOX_WIDTH / 2
          : PADDING + (index / (points.length - 1)) * (VIEWBOX_WIDTH - PADDING * 2);
      const y =
        VIEWBOX_HEIGHT - PADDING - ((value - minValue) / range) * (VIEWBOX_HEIGHT - PADDING * 2);

      return `${x},${y}`;
    })
    .join(" ");
}

export function Sparkline(props: SparklineProps) {
  return (
    <svg
      class="h-full w-full"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={props.color}
        stroke-width="1.45"
        points={toPolylinePoints(props.points)}
      />
    </svg>
  );
}
