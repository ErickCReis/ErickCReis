import type { BlogPost } from "@/lib/eden";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

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

export function PostList({ posts }: PostListProps) {
  const [openSlug, setOpenSlug] = useState<string | null>(posts[0]?.slug ?? null);
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    if (!hasAutoOpenedRef.current && posts[0]) {
      setOpenSlug(posts[0].slug);
      hasAutoOpenedRef.current = true;
      return;
    }

    if (openSlug && !posts.some((post) => post.slug === openSlug)) {
      setOpenSlug(posts[0]?.slug ?? null);
    }
  }, [openSlug, posts]);

  if (posts.length === 0) {
    return <p className="text-sm text-muted-foreground md:text-base">No posts published yet.</p>;
  }

  return (
    <section className="space-y-3" aria-label="Blog posts">
      {posts.map((post) => {
        const isOpen = openSlug === post.slug;

        return (
          <article key={post.slug} className="border-border/60 border-b pb-4">
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpenSlug((previous) => (previous === post.slug ? null : post.slug));
                }}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span className="font-serif text-2xl leading-tight tracking-wide text-foreground">{post.title}</span>
                <span
                  className={cn(
                    "font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase transition-colors",
                    isOpen ? "text-foreground/90" : "text-muted-foreground",
                  )}
                >
                  {isOpen ? "close" : "open"}
                </span>
              </button>
            </h3>

            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
                isOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{post.description}</p>
                <p className="mt-3 font-mono text-[0.62rem] tracking-[0.12em] text-muted-foreground uppercase">
                  {formatPublishedDate(post.date)}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
