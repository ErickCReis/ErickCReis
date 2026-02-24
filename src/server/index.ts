import { app, startStatsSampler } from "./app";

const port = Number(process.env.PORT ?? "3000");

app.listen({
  hostname: "0.0.0.0",
  port,
});

if (app.server) {
  startStatsSampler(app.server);
}

console.log(`Server listening on http://0.0.0.0:${port}`);
