import { Suspense, useState } from "react";

import { ContentHeader } from "@/features/content/components/content-header";
import { PostList } from "@/features/content/components/post-list";
import { TelemetryBackdrop } from "@/features/home/components/telemetry-backdrop";
import { useServerPulse } from "@/features/home/hooks/use-server-pulse";

export function ContentPage() {
  const { panels } = useServerPulse([]);
  const [isStatsBackdropEnabled, setIsStatsBackdropEnabled] = useState(true);

  return (
    <>
      {isStatsBackdropEnabled ? <TelemetryBackdrop panels={panels} /> : null}

      <main className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-4 py-12 md:px-8">
        <section className="space-y-8 py-4">
          <ContentHeader
            isStatsBackdropEnabled={isStatsBackdropEnabled}
            onToggleStatsBackdrop={() => {
              setIsStatsBackdropEnabled((previous) => !previous);
            }}
          />
          <Suspense fallback={null}>
            <PostList />
          </Suspense>
        </section>
      </main>
    </>
  );
}
