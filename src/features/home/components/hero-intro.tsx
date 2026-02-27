import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type HeroIntroProps = {
  onOpenContent: () => void;
  onOpenGithub: () => void;
};

export function HeroIntro({ onOpenContent, onOpenGithub }: HeroIntroProps) {
  return (
    <section class="space-y-5">
      <Badge
        variant="outline"
        class="rounded-full border-border/80 bg-card/40 px-3 py-1 font-mono tracking-[0.22em] uppercase"
      >
        live portfolio
      </Badge>
      <h1 class="font-serif text-5xl leading-[0.88] tracking-wide md:text-7xl">Erick C. Reis</h1>
      <p class="max-w-xl text-sm text-muted-foreground md:text-base">
        TypeScript, React, Tailwind, shadcn/ui, Elysia, and Bun, with realtime cursor and telemetry
        overlays.
      </p>
      <div class="flex flex-wrap gap-3">
        <Button onClick={onOpenContent}>Content</Button>
        <Button variant="outline" onClick={onOpenGithub}>
          GitHub
        </Button>
      </div>
    </section>
  );
}
