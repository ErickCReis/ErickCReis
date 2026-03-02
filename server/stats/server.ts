import { version } from "../../package.json";
import type { ServerInfoStat } from "@shared/stats/server";
import type { StatModule } from "@server/stats/types";

const MAX_HISTORY = 84;
const SAMPLE_INTERVAL_MS = 1500;

function sample(): ServerInfoStat {
  return {
    timestamp: Date.now(),
    appVersion: version,
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

let latest: ServerInfoStat = sample();
let history: ServerInfoStat[] = [];
let dirty = false;
let started = false;

export const serverInfoStat: StatModule<ServerInfoStat> = {
  start() {
    if (started) return;
    started = true;

    const tick = () => {
      latest = sample();
      history.push(latest);
      if (history.length > MAX_HISTORY) history.shift();
      dirty = true;
    };

    tick();
    setInterval(tick, SAMPLE_INTERVAL_MS);
  },
  getLatest: () => latest,
  getHistory: () => [...history],
  consumeLatest() {
    if (!dirty) return null;
    dirty = false;
    return latest;
  },
};
