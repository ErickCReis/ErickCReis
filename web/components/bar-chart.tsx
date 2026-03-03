import { For } from "solid-js";

type BarChartProps = {
  bars: { label: string; value: number }[];
  color: string;
};

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 48;
const LABEL_AREA = 10;
const CHART_HEIGHT = VIEWBOX_HEIGHT - LABEL_AREA;
const BAR_GAP = 2;
const MIN_BAR_HEIGHT = 1;

export function BarChart(props: BarChartProps) {
  const maxValue = () => Math.max(...props.bars.map((b) => b.value), 1);
  const barWidth = () => {
    const count = props.bars.length || 1;
    return (VIEWBOX_WIDTH - BAR_GAP * (count - 1)) / count;
  };

  return (
    <svg
      class="h-full w-full"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
    >
      <For each={props.bars}>
        {(bar, index) => {
          const x = () => index() * (barWidth() + BAR_GAP);
          const height = () =>
            bar.value > 0
              ? Math.max(MIN_BAR_HEIGHT, (bar.value / maxValue()) * CHART_HEIGHT)
              : MIN_BAR_HEIGHT;
          const y = () => CHART_HEIGHT - height();

          return (
            <>
              <rect
                x={x()}
                y={y()}
                width={barWidth()}
                height={height()}
                fill={props.color}
                fill-opacity={0.6}
                stroke={props.color}
                stroke-width={0.5}
                rx={0.8}
              />
              <text
                x={x() + barWidth() / 2}
                y={VIEWBOX_HEIGHT - 1}
                text-anchor="middle"
                fill="currentColor"
                class="text-slate-400/60"
                font-size="3.2"
                font-family="monospace"
              >
                {bar.label}
              </text>
            </>
          );
        }}
      </For>
    </svg>
  );
}
