FROM oven/bun:1.3 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.3 AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["bun", "--cwd", "./dist", "index.js"]
