import { cn } from "@/lib/utils";
import { For, createEffect, createSignal } from "solid-js";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
};

type PostListProps = {
  posts: BlogPost[];
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatPublishedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return dateFormatter.format(date);
}

export function PostList(props: PostListProps) {
  const [openSlug, setOpenSlug] = createSignal<string | null>(props.posts[0]?.slug ?? null);

  createEffect(() => {
    if (props.posts.length === 0) {
      setOpenSlug(null);
      return;
    }

    const currentOpenSlug = openSlug();
    if (!currentOpenSlug || !props.posts.some((post) => post.slug === currentOpenSlug)) {
      setOpenSlug(props.posts[0].slug);
    }
  });

  if (props.posts.length === 0) {
    return <p class="text-sm text-muted-foreground md:text-base">No posts published yet.</p>;
  }

  return (
    <section class="space-y-3" aria-label="Blog posts">
      <For each={props.posts}>
        {(post) => {
          const isOpen = () => openSlug() === post.slug;

          return (
            <article class="border-border/60 border-b pb-4">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen()}
                  onClick={() => {
                    setOpenSlug((previous) => (previous === post.slug ? null : post.slug));
                  }}
                  class="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span class="font-serif text-2xl leading-tight tracking-wide text-foreground">
                    {post.title}
                  </span>
                  <span
                    class={cn(
                      "font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase transition-colors",
                      isOpen() ? "text-foreground/90" : "text-muted-foreground",
                    )}
                  >
                    {isOpen() ? "close" : "open"}
                  </span>
                </button>
              </h3>

              <div
                class={cn(
                  "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
                  isOpen() ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div class="overflow-hidden">
                  <p class="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                    {post.description}
                  </p>
                  <p class="mt-3 font-mono text-[0.62rem] tracking-[0.12em] text-muted-foreground uppercase">
                    {formatPublishedDate(post.date)}
                  </p>
                </div>
              </div>
            </article>
          );
        }}
      </For>
    </section>
  );
}
