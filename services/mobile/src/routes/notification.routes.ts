import { Response } from "express";
import { redis } from "@thrico/database";
import { log } from "@thrico/logging";
import checkAuth from "../utils/auth/checkAuth.utils";

export const handleNotificationStream = async (req: any, res: Response) => {
  try {
    // 1. Authenticate user
    // SSE often passes token via query string because EventSource doesn't support headers
    if (!req.headers.authorization && req.query.token) {
      req.headers.authorization = req.query.token as string;
    }

    const user = await checkAuth(req);
    if (!user || !user.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { REDIS_KEYS } = await import("@thrico/shared");
    const { userId } = user;
    log.info("📡 SSE connection established", { userId });

    // 2. Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // 3. Create a dedicated Redis subscriber client
    // We use the already initialized redis.client and duplicate it for subscription
    const subscriber = redis.client.duplicate();

    const channel = `${REDIS_KEYS.NOTIFICATION_CACHE}pubsub:${userId}`;
    await subscriber.subscribe(channel);

    // 4. Listen for messages
    subscriber.on("message", (chan: string, message: string) => {
      if (chan === channel) {
        log.debug("📣 SSE Sending notification to client", { userId });
        res.write(`data: ${message}\n\n`);
      }
    });

    // 5. Send heartbeat every 30s to keep connection alive
    const heartbeatId = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 30000);

    // 6. Cleanup on close
    req.on("close", async () => {
      log.info("📡 SSE connection closed", { userId });
      clearInterval(heartbeatId);
      try {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
      } catch (err) {
        log.error("Error during SSE cleanup", { err });
      }
    });
  } catch (error: any) {
    log.error("❌ Error in SSE stream", { error: error.message });
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
