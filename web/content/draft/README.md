# Live Portfolio Series Drafts

Working sketches for a chronological blog series about how this project became a small live system.

These files are intentionally outside `web/content/blog`, so Astro does not publish them as blog posts.

## Publishing Workflow

Keep incomplete sketches in this directory. Move finished English and `pt-BR` posts into
`web/content/blog` and give both files the same `date: "YYYY-MM-DD"` frontmatter value.

The date is both the date displayed on the post and its scheduled publication date in the
`America/Sao_Paulo` timezone. Future posts remain available for local review with `bun run dev`,
but production builds exclude them from blog listings, direct article routes, and the sitemap.

Deploy on or after the scheduled date to publish a post. Changing or reaching the date does not
alter an already deployed build; a new deployment is required.

## Planned Order

1. [From Prototype To Live System](./01-from-prototype-to-live-system.md)
2. [Astro As The Static Shell, Solid As The Live Layer](./02-astro-static-shell-solid-live-layer.md)
3. [Realtime Cursor Presence With Tiny Pieces](./03-realtime-cursor-presence.md)
4. [Personal Telemetry From Spotify And GitHub](./04-spotify-github-telemetry.md)
5. [The Stats Pipeline](./05-stats-pipeline.md)
6. [Shipping Astro From A Bun Server](./06-shipping-astro-from-bun.md)
7. [Health Telemetry From The Real Runtime](./07-runtime-health-telemetry.md)
8. [The Blog Layer](./08-blog-layer.md)
9. [A Small Custom i18n Runtime For Astro](./09-custom-i18n-runtime.md)
10. [Agent Token Usage As A First-Class Stat](./10-agent-token-usage.md)

## Series Angle

The series should avoid becoming a generic stack overview. Each post should focus on one small capability, the libraries that make it possible, and the project constraint that shaped the implementation.

Recurring thread:

- Static when possible.
- Live only where it adds useful behavior.
- Shared contracts between server and client.
- Small integrations composed into a visible product surface.
