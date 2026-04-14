import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// ─── Mediasoup ───────────────────────────────────────────────────────────────
export const MEDIASOUP_LISTEN_IP =
  process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0";

/**
 * MEDIASOUP_ANNOUNCED_IP must be set to the PUBLIC IP of this server in
 * production so that remote clients (mobile behind NAT) can reach it.
 * In development, 127.0.0.1 works for local testing.
 */
export const MEDIASOUP_ANNOUNCED_IP =
  process.env.MEDIASOUP_ANNOUNCED_IP || "127.0.0.1";

export const MEDIASOUP_RTC_MIN_PORT = parseInt(
  process.env.MEDIASOUP_RTC_MIN_PORT || "10000",
  10
);
export const MEDIASOUP_RTC_MAX_PORT = parseInt(
  process.env.MEDIASOUP_RTC_MAX_PORT || "20000",
  10
);

export const MEDIASOUP_WORKER_LOG_LEVEL =
  (process.env.MEDIASOUP_WORKER_LOG_LEVEL as any) || "warn";

// ─── Service ────────────────────────────────────────────────────────────────
export const LIVE_PORT = parseInt(process.env.LIVE_PORT || "5555", 10);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const JWT_TOKEN = process.env.JWT_TOKEN || "secret";

// ─── Redis ───────────────────────────────────────────────────────────────────
export const REDIS_HOST = process.env.REDIS_HOST || "localhost";
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
export const REDIS_USERNAME = process.env.REDIS_USERNAME;
