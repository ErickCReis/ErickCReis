import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ContentHeaderProps = {
  isStatsBackdropEnabled: boolean;
  onToggleStatsBackdrop: () => void;
};

export function ContentHeader({
  isStatsBackdropEnabled,
  onToggleStatsBackdrop,
}: ContentHeaderProps) {
  return (
    <header class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Badge
          variant="outline"
          class="w-fit rounded-full border-border/70 px-3 py-1 font-mono tracking-[0.22em] uppercase"
        >
          Content
        </Badge>
        <button
          type="button"
          onClick={onToggleStatsBackdrop}
          aria-pressed={isStatsBackdropEnabled}
          class={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.6rem] tracking-[0.16em] uppercase transition-colors",
            isStatsBackdropEnabled
              ? "border-slate-200/35 text-slate-100/90 hover:bg-slate-900/35"
              : "border-slate-200/15 text-slate-300/70 hover:text-slate-200/90",
          )}
        >
          <span
            class={cn(
              "inline-block size-1.5 rounded-full",
              isStatsBackdropEnabled ? "bg-[rgb(142,199,255)]" : "bg-slate-400/60",
            )}
          />
          Stats {isStatsBackdropEnabled ? "On" : "Off"}
        </button>
      </div>
      <h1 class="font-serif text-4xl tracking-wide md:text-5xl">Blog</h1>
      <p class="max-w-xl text-sm leading-relaxed text-muted-foreground">
        One simple post to mark the beginning.
      </p>
    </header>
  );
}
