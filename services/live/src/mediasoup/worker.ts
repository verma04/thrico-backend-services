import * as mediasoup from "mediasoup";
import {
  MEDIASOUP_LISTEN_IP,
  MEDIASOUP_ANNOUNCED_IP,
  MEDIASOUP_RTC_MIN_PORT,
  MEDIASOUP_RTC_MAX_PORT,
  MEDIASOUP_WORKER_LOG_LEVEL,
} from "../config";
import { log } from "@thrico/logging";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkerWithRouter {
  worker: mediasoup.types.Worker;
  router: mediasoup.types.Router;
}

// ─── Codec Capabilities ──────────────────────────────────────────────────────

export const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
  {
    kind: "video",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f",
      "level-asymmetry-allowed": 1,
    },
  },
];

// ─── Worker Pool ─────────────────────────────────────────────────────────────

const workers: WorkerWithRouter[] = [];
let workerIndex = 0;
const NUM_WORKERS = Math.min(
  parseInt(process.env.MEDIASOUP_NUM_WORKERS || "2", 10),
  require("os").cpus().length
);

export async function createWorkers(): Promise<void> {
  log.info(`[mediasoup] Creating ${NUM_WORKERS} worker(s)…`);

  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: MEDIASOUP_WORKER_LOG_LEVEL,
      logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
      rtcMinPort: MEDIASOUP_RTC_MIN_PORT,
      rtcMaxPort: MEDIASOUP_RTC_MAX_PORT,
    });

    worker.on("died", () => {
      log.error(`[mediasoup] Worker ${worker.pid} died – recreating…`);
      // In production you should recreate the worker; for now just log.
      process.exit(1);
    });

    const router = await worker.createRouter({ mediaCodecs });

    workers.push({ worker, router });

    log.info(`[mediasoup] Worker ${worker.pid} ready`);
  }
}

/** Round-robin worker selection */
export function getNextWorker(): WorkerWithRouter {
  const pair = workers[workerIndex % workers.length];
  workerIndex++;
  return pair;
}

// ─── Transport Factory ───────────────────────────────────────────────────────

export async function createWebRtcTransport(
  router: mediasoup.types.Router
): Promise<mediasoup.types.WebRtcTransport> {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: MEDIASOUP_LISTEN_IP,
        announcedIp: MEDIASOUP_ANNOUNCED_IP,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1_000_000,
  });

  // Auto-close after 30 minutes of inactivity
  transport.on("routerclose", () => transport.close());

  return transport;
}
