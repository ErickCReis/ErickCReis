import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { formatViewCountLabel, registerPostView } from "@web/lib/content-views";

type PostViewCounterProps = {
  slug: string;
};

export function PostViewCounter(props: PostViewCounterProps) {
  const [label, setLabel] = createSignal("-- views");
  const [hasError, setHasError] = createSignal(false);

  onMount(() => {
    let isDisposed = false;

    const load = async () => {
      try {
        const result = await registerPostView(props.slug);
        if (isDisposed) return;
        setLabel(formatViewCountLabel(result.totalViews));
      } catch {
        if (isDisposed) return;
        setHasError(true);
      }
    };

    if (document.visibilityState === "visible") {
      void load();
    } else {
      const handleVisibilityChange = () => {
        if (document.visibilityState !== "visible") return;
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        void load();
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      onCleanup(() => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      });
    }

    onCleanup(() => {
      isDisposed = true;
    });
  });

  return (
    <Show when={!hasError()}>
      <span aria-live="polite">{label()}</span>
    </Show>
  );
}
