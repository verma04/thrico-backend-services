import "dotenv/config";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";

import { log } from "@thrico/logging";
import { LIVE_PORT } from "./config";
import { createWorkers } from "./mediasoup/worker";
import { socketAuthMiddleware } from "./middleware/auth.middleware";
import { registerSocketHandlers } from "./socket/handlers";
import { getRooms } from "./room/roomManager";

async function bootstrap() {
  // ── 1. Mediasoup workers ──────────────────────────────────────────────────
  await createWorkers();

  // ── 2. Express app ────────────────────────────────────────────────────────
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(cors({ credentials: true }));
  app.use(express.json());

  // ── 3. Health & metrics ───────────────────────────────────────────────────
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "thrico-live",
      rooms: getRooms().length,
      totalPeers: getRooms().reduce((acc, r) => acc + r.peers.size, 0),
    });
  });

  // ── 4. HTTP + Socket.IO ────────────────────────────────────────────────────
  const httpServer = createServer(app);

  const io = new IOServer(httpServer, {
    cors: {
      origin: "*", // tighten in production
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // JWT auth middleware for every socket connection
  io.use(socketAuthMiddleware);

  // Register all SFU/signaling handlers
  io.on("connection", (socket) => {
    registerSocketHandlers(io, socket);
  });

  // ── 5. Start ──────────────────────────────────────────────────────────────
  httpServer.listen(LIVE_PORT, () => {
    log.info(`Thrico Live server started`, {
      port: LIVE_PORT,
      environment: process.env.NODE_ENV || "development",
    });
  });

  // ── 6. Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    log.info(`${signal} received – shutting down Thrico Live`);
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  log.error("Failed to start Thrico Live server", { error: err.message });
  process.exit(1);
});
