import { For, Show } from "solid-js";

type BarSegment = { value: number; color: string };
type Bar = { label: string; value?: number; segments?: BarSegment[] };

type BarChartProps = {
  bars: Bar[];
  color?: string;
  labelFontSize?: number;
  showLabels?: boolean;
};

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 48;
const LABEL_AREA = 10;
const BAR_GAP = 2;
const MIN_BAR_HEIGHT = 1;

function segmentsFor(bar: Bar, fallbackColor: string): BarSegment[] {
  if (bar.segments) return bar.segments;
  return [{ value: bar.value ?? 0, color: fallbackColor }];
}

export function BarChart(props: BarChartProps) {
  const fallbackColor = () => props.color ?? "currentColor";
  const barTotal = (bar: Bar) =>
    segmentsFor(bar, fallbackColor()).reduce((sum, segment) => sum + segment.value, 0);
  const maxValue = () => Math.max(...props.bars.map(barTotal), 1);
  const labelFontSize = () => props.labelFontSize ?? 3.2;
  const showLabels = () => props.showLabels ?? true;
  const chartHeight = () => VIEWBOX_HEIGHT - (showLabels() ? LABEL_AREA : 0);
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
          const segments = () => segmentsFor(bar, fallbackColor());
          const total = () => barTotal(bar);

          return (
            <>
              <Show
                when={total() > 0}
                fallback={
                  <rect
                    x={x()}
                    y={chartHeight() - MIN_BAR_HEIGHT}
                    width={barWidth()}
                    height={MIN_BAR_HEIGHT}
                    fill={segments()[0]?.color ?? fallbackColor()}
                    fill-opacity={0.6}
                    stroke={segments()[0]?.color ?? fallbackColor()}
                    stroke-width={0.5}
                    rx={0.8}
                  />
                }
              >
                <For each={segments()}>
                  {(segment, segmentIndex) => {
                    const priorValue = () =>
                      segments()
                        .slice(0, segmentIndex())
                        .reduce((sum, item) => sum + item.value, 0);
                    const height = () => (segment.value / maxValue()) * chartHeight();
                    const y = () =>
                      chartHeight() - (priorValue() / maxValue()) * chartHeight() - height();

                    return (
                      <Show when={segment.value > 0}>
                        <rect
                          x={x()}
                          y={y()}
                          width={barWidth()}
                          height={height()}
                          fill={segment.color}
                          fill-opacity={0.6}
                          stroke={segment.color}
                          stroke-width={0.5}
                          rx={0.8}
                        />
                      </Show>
                    );
                  }}
                </For>
              </Show>
              <Show when={showLabels()}>
                <text
                  x={x() + barWidth() / 2}
                  y={VIEWBOX_HEIGHT - 1}
                  text-anchor="middle"
                  fill="currentColor"
                  class="text-slate-400/80"
                  font-size={String(labelFontSize())}
                >
                  {bar.label}
                </text>
              </Show>
            </>
          );
        }}
      </For>
    </svg>
  );
}
