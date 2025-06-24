import { DurableObject } from "cloudflare:workers";
import { os } from "@orpc/server";
import {
  experimental_encodeHibernationRPCEvent as encodeHibernationRPCEvent,
  experimental_HibernationEventIterator as HibernationEventIterator,
  experimental_HibernationPlugin as HibernationPlugin,
} from "@orpc/server/hibernation";
import { experimental_RPCHandler as RPCHandler } from "@orpc/server/websocket";
import { z } from "zod";

const base = os.$context<{
  handler: RPCHandler<any>;
  ws: WebSocket;
  getWebsockets: () => WebSocket[];
}>();

export const router = {
  send: base
    .input(z.object({ id: z.string(), x: z.number(), y: z.number() }))
    .handler(async ({ input, context }) => {
      const websockets = context.getWebsockets();

      for (const ws of websockets) {
        const data = ws.deserializeAttachment();
        if (typeof data !== "object" || data === null) {
          continue;
        }

        const { id } = data;
        ws.send(
          encodeHibernationRPCEvent(id, {
            id: input.id,
            x: input.x,
            y: input.y,
          }),
        );
      }
    }),
  onMessage: base.handler(async ({ context }) => {
    return new HibernationEventIterator<{ id: string; x: number; y: number }>(
      (id) => {
        context.ws.serializeAttachment({ id });
      },
    );
  }),
};

export type CursorPositionRouter = typeof router;

const handler = new RPCHandler(router, {
  plugins: [new HibernationPlugin()],
});

export class CursorPosition extends DurableObject {
  async fetch() {
    const { "0": client, "1": server } = new WebSocketPair();

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    await handler.message(ws, message, {
      context: {
        handler,
        ws,
        getWebsockets: () => this.ctx.getWebSockets(),
      },
    });
  }

  async webSocketClose(ws: WebSocket) {
    handler.close(ws);
  }
}
