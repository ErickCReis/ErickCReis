/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    isUpgradeRequest: boolean;
    upgradeWebSocket(): { response: Response; socket: WebSocket };
  }
}
