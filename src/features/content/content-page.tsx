import { Suspense, createSignal } from "solid-js";

import { ContentHeader } from "@/features/content/components/content-header";
import { PostList, type BlogPost } from "@/features/content/components/post-list";
import { TelemetryBackdrop } from "@/features/home/components/telemetry-backdrop";

type ContentPageProps = {
  posts: BlogPost[];
};

export default function ContentPage(props: ContentPageProps) {
  const [isStatsBackdropEnabled, setIsStatsBackdropEnabled] = createSignal(true);

  return (
    <>
      <Suspense fallback={null}>{isStatsBackdropEnabled() ? <TelemetryBackdrop /> : null}</Suspense>

      <main class="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-4 py-12 md:px-8">
        <section class="space-y-8 py-4">
          <ContentHeader
            isStatsBackdropEnabled={isStatsBackdropEnabled()}
            onToggleStatsBackdrop={() => {
              setIsStatsBackdropEnabled((previous) => !previous);
            }}
          />
          <PostList posts={props.posts} />
        </section>
      </main>
    </>
  );
}
