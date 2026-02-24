FROM oven/bun:1.3 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM debian:bookworm-slim AS runtime

WORKDIR /app/dist

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/dist/server ./server
COPY --from=build /app/dist/pages ./pages

EXPOSE 3000

CMD ["./server"]
