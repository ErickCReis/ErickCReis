import { TelemetryBackdrop } from "@/features/home/components/telemetry-backdrop";
import { CursorPresenceLayer } from "@/features/home/components/cursor-presence-layer";
import { HeroIntro } from "@/features/home/components/hero-intro";
import { useCursorPresence } from "@/features/home/hooks/use-cursor-presence";
import { useServerPulse } from "@/features/home/hooks/use-server-pulse";
import { statsBootstrapResource } from "@/features/home/lib/stats-bootstrap";
import type { ServerStats } from "@/features/home/types";
import { useState } from "react";

type HomePageProps = {
  initialHistory: ServerStats[];
};

export function HomePage({ initialHistory }: HomePageProps) {
  const { panels } = useServerPulse(initialHistory);
  const { selfId, cursors } = useCursorPresence();
  const [isStatsHovered, setIsStatsHovered] = useState(false);

  return (
    <>
      <TelemetryBackdrop panels={panels} onStatsHoverChange={setIsStatsHovered} />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 md:px-8">
        <div className="grid w-full gap-8 md:grid-cols-[1.3fr_0.7fr]">
          <HeroIntro
            onOpenContent={() => {
              window.location.href = "/content";
            }}
            onOpenGithub={() => {
              window.open("https://github.com/erickreis", "_blank", "noopener,noreferrer");
            }}
          />
        </div>
      </main>

      <CursorPresenceLayer selfId={selfId} cursors={cursors} isStatsHovered={isStatsHovered} />
    </>
  );
}

export function HomePageLoader() {
  const bootstrap = statsBootstrapResource.read();
  return <HomePage initialHistory={bootstrap.history} />;
}
