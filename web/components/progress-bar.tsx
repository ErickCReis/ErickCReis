function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

type ProgressBarProps = {
  progressMs: number;
  durationMs: number;
  color: string;
};

export function ProgressBar(props: ProgressBarProps) {
  const pct = () => {
    if (props.durationMs <= 0) return 0;
    return Math.min(100, (props.progressMs / props.durationMs) * 100);
  };

  return (
    <div>
      <div class="h-1 w-full overflow-hidden rounded-full bg-slate-700/40">
        <div
          class="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct()}%`, "background-color": props.color }}
        />
      </div>
      <div class="mt-1 flex justify-between font-mono text-xxs text-slate-300/60">
        <span>{formatDuration(props.progressMs)}</span>
        <span>{formatDuration(props.durationMs)}</span>
      </div>
    </div>
  );
}
