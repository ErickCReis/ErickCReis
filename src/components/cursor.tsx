import { cursorsPositions } from "@/lib/cursor-positions";
import type { BlogPost } from "@/lib/eden";
import { getBlogPosts, publishCursor } from "@/lib/eden";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createMousePosition } from "@solid-primitives/mouse";
import { throttle } from "@solid-primitives/scheduled";
import { createDerivedSpring } from "@solid-primitives/spring";
import { createEffect, createResource, For, Show } from "solid-js";

const id = Math.random().toString(36).substring(2, 15);

export function CursorPosition() {
  const pos = createMousePosition(window);
  const [posts] = createResource(getBlogPosts);
  const throttledPos = throttle((x: number, y: number) => {
    publishCursor({ id, x, y });
  }, 100);

  createEffect(() => {
    if (Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      throttledPos(pos.x, pos.y);
    }
  });

  return (
    <div class="relative min-h-screen overflow-x-hidden px-4 py-8 md:px-8 md:py-10">
      <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(143,249,255,0.08),transparent_25%)]" />
      <div class="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header class="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/70 p-6 shadow-[0_25px_70px_rgba(3,7,18,0.55)] backdrop-blur-sm">
          <div class="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              class="font-mono text-[11px] uppercase tracking-[0.25em] text-primary"
            >
              Elysia + Eden + Bun
            </Badge>
            <Badge variant="secondary" class="font-mono text-[11px] uppercase tracking-[0.2em]">
              Tailwind + Shadcn
            </Badge>
          </div>
          <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 class="text-3xl font-semibold tracking-tight md:text-4xl">
                Realtime Cursor Relay
              </h1>
              <p class="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Shared pointer movement across clients with Eden websocket messaging and a
                Bun-native API.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              class="w-fit font-mono"
              onClick={() => window.location.reload()}
            >
              Reconnect socket
            </Button>
          </div>
        </header>

        <div class="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <Card class="bg-card/75 shadow-[0_20px_50px_rgba(2,10,25,0.4)] backdrop-blur-sm">
            <CardHeader class="flex-row items-start justify-between space-y-0">
              <div class="space-y-2">
                <CardTitle class="text-xl">Live cursors</CardTitle>
                <CardDescription>Connected clients are streamed in near realtime.</CardDescription>
              </div>
              <Badge class="font-mono">{Object.keys(cursorsPositions).length} active</Badge>
            </CardHeader>
            <CardContent>
              <Show
                when={Object.keys(cursorsPositions).length > 0}
                fallback={
                  <p class="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                    Move your mouse in two tabs to start streaming cursors.
                  </p>
                }
              >
                <ul class="space-y-3">
                  <For each={Object.entries(cursorsPositions)}>
                    {([cursorId, cursor]) => (
                      <li class="rounded-xl border border-border/80 bg-background/65 p-4">
                        <div class="flex items-center justify-between gap-4">
                          <span class="font-mono text-xs text-primary">{cursorId}</span>
                          <span class="font-mono text-xs text-muted-foreground">
                            {Math.round(cursor.x)}, {Math.round(cursor.y)}
                          </span>
                        </div>
                        <Point x={cursor.x} y={cursor.y} />
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </CardContent>
          </Card>

          <Card class="bg-card/75 shadow-[0_20px_50px_rgba(2,10,25,0.4)] backdrop-blur-sm">
            <CardHeader>
              <CardTitle class="text-xl">Blog</CardTitle>
              <CardDescription>
                Posts loaded from `fuma-content` over the Elysia API.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <Show
                when={!posts.loading && !posts.error && posts()}
                fallback={
                  <p class="text-sm text-muted-foreground">
                    {posts.error ? "Failed to load posts." : "Loading posts..."}
                  </p>
                }
              >
                {(items) => (
                  <ul class="space-y-3">
                    <For each={items()}>{(post) => <BlogCard post={post} />}</For>
                  </ul>
                )}
              </Show>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BlogCard(props: { post: BlogPost }) {
  return (
    <li class="rounded-xl border border-border/80 bg-background/65 p-4">
      <time class="font-mono text-xs text-muted-foreground">{props.post.date}</time>
      <h3 class="mt-2 text-base font-semibold">{props.post.title}</h3>
      <p class="mt-1 text-sm text-muted-foreground">{props.post.description}</p>
      <small class="mt-2 block font-mono text-xs text-accent">/{props.post.slug}</small>
    </li>
  );
}

export function Point(props: { x: number; y: number }) {
  const springPosX = createDerivedSpring(() => props.x);
  const springPosY = createDerivedSpring(() => props.y);
  return (
    <div
      class="pointer-events-none fixed z-50 size-2.5 rounded-full bg-primary shadow-[0_0_14px_rgba(116,240,255,0.8)]"
      style={{
        left: `${springPosX()}px`,
        top: `${springPosY()}px`,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
}
