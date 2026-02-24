import { ContentHeader } from "@/features/content/components/content-header";
import { PostList } from "@/features/content/components/post-list";
import { useBlogPosts } from "@/features/content/hooks/use-blog-posts";
import { TelemetryBackdrop } from "@/features/home/components/telemetry-backdrop";
import { useServerPulse } from "@/features/home/hooks/use-server-pulse";
import { useState } from "react";

export function ContentPage() {
  const posts = useBlogPosts();
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
          <PostList posts={posts} />
        </section>
      </main>
    </>
  );
}
