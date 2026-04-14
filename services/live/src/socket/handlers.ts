import { Server as IOServer, Socket } from "socket.io";
import { log } from "@thrico/logging";
import { getSocketUser } from "../middleware/auth.middleware";
import { createWebRtcTransport, getNextWorker } from "../mediasoup/worker";
import {
  getOrCreateRoom,
  getRoom,
  addPeer,
  getPeer,
  removePeer,
} from "../room/roomManager";
import * as mediasoup from "mediasoup";

// ─── Event name constants ────────────────────────────────────────────────────
// Keep these in sync with your React Native client

export const EVENTS = {
  // Client → Server
  JOIN_LIVE: "JOIN_LIVE",
  LEAVE_LIVE: "LEAVE_LIVE",
  GET_RTP_CAPABILITIES: "GET_RTP_CAPABILITIES",
  CREATE_SEND_TRANSPORT: "CREATE_SEND_TRANSPORT",
  CREATE_RECV_TRANSPORT: "CREATE_RECV_TRANSPORT",
  CONNECT_TRANSPORT: "CONNECT_TRANSPORT",
  PRODUCE: "PRODUCE",
  CONSUME: "CONSUME",
  RESUME_CONSUMER: "RESUME_CONSUMER",
  SEND_CHAT: "SEND_CHAT",
  SEND_REACTION: "SEND_REACTION",

  // Server → Client
  NEW_PRODUCER: "NEW_PRODUCER",
  PRODUCER_CLOSED: "PRODUCER_CLOSED",
  PEER_JOINED: "PEER_JOINED",
  PEER_LEFT: "PEER_LEFT",
  CHAT_MESSAGE: "CHAT_MESSAGE",
  REACTION: "REACTION",
  LIVE_ENDED: "LIVE_ENDED",
  ERROR: "ERROR",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type CB = (data: any) => void;

function ack(callback: CB, data: object) {
  if (typeof callback === "function") callback(data);
}

function errAck(callback: CB, message: string) {
  if (typeof callback === "function") callback({ error: message });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export function registerSocketHandlers(io: IOServer, socket: Socket): void {
  const user = getSocketUser(socket);
  const { memberId } = user;
  let currentRoomId: string | null = null;

  log.info("[socket] Peer connected", { memberId, socketId: socket.id });

  // ──────────────────────────────────────────────────────────────────────────
  // JOIN_LIVE
  // payload: { roomId, role: "host" | "guest" | "viewer" }
  // ──────────────────────────────────────────────────────────────────────────
  socket.on(EVENTS.JOIN_LIVE, async (payload: any, callback: CB) => {
    try {
      const { roomId, role = "viewer" } = payload;
      currentRoomId = roomId;

      const { router } = getNextWorker();
      const room = getOrCreateRoom(
        roomId,
        router,
        role === "host" ? memberId : null
      );

      addPeer(room, {
        socketId: socket.id,
        memberId,
        role,
        producers: new Map(),
        consumers: new Map(),
      });

      socket.join(roomId);

      // Notify others
      socket.to(roomId).emit(EVENTS.PEER_JOINED, { memberId, role });

      // Tell the caller about existing producers so they can subscribe
      const existingProducers: { producerId: string; memberId: string }[] = [];
      room.peers.forEach((p) => {
        if (p.socketId !== socket.id) {
          p.producers.forEach((producer, producerId) => {
            existingProducers.push({ producerId, memberId: p.memberId });
          });
        }
      });

      log.info("[socket] JOIN_LIVE", { memberId, roomId, role });
      ack(callback, {
        rtpCapabilities: room.router.rtpCapabilities,
        existingProducers,
        viewerCount: room.peers.size,
      });
    } catch (err: any) {
      log.error("[socket] JOIN_LIVE error", { error: err.message });
      errAck(callback, err.message);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET_RTP_CAPABILITIES (standalone – if client needs it separately)
  // ──────────────────────────────────────────────────────────────────────────
  socket.on(EVENTS.GET_RTP_CAPABILITIES, async (payload: any, callback: CB) => {
    try {
      const { roomId } = payload;
      const room = getRoom(roomId);
      if (!room) return errAck(callback, "ROOM_NOT_FOUND");
      ack(callback, { rtpCapabilities: room.router.rtpCapabilities });
    } catch (err: any) {
      errAck(callback, err.message);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE_SEND_TRANSPORT  (host / guest only)
  // ──────────────────────────────────────────────────────────────────────────
  socket.on(
    EVENTS.CREATE_SEND_TRANSPORT,
    async (payload: any, callback: CB) => {
      try {
        const { roomId } = payload;
        const room = getRoom(roomId);
        if (!room) return errAck(callback, "ROOM_NOT_FOUND");

        const peer = getPeer(room, socket.id);
        if (!peer) return errAck(callback, "PEER_NOT_FOUND");

        const transport = await createWebRtcTransport(room.router);
        peer.sendTransport = transport;

        log.info("[socket] CREATE_SEND_TRANSPORT", {
          memberId,
          transportId: transport.id,
        });
        ack(callback, {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (err: any) {
        errAck(callback, err.message);
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE_RECV_TRANSPORT  (all roles)
  // ──────────────────────────────────────────────────────────────────────────
  socket.on(
    EVENTS.CREATE_RECV_TRANSPORT,
    async (payload: any, callback: CB) => {
      try {
        const { roomId } = payload;
        const room = getRoom(roomId);
        if (!room) return errAck(callback, "ROOM_NOT_FOUND");

        const peer = getPeer(room, socket.id);
        if (!peer) return errAck(callback, "PEER_NOT_FOUND");

        const transport = await createWebRtcTransport(room.router);
        peer.recvTransport = transport;

        log.info("[socket] CREATE_RECV_TRANSPORT", {
          memberId,
          transportId: transport.id,
        });
        ack(callback, {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (err: any) {
        errAck(callback, err.message);
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // CONNECT_TRANSPORT
  // payload: { roomId, transportId, dtlsParameters, direction: "send"|"recv" }
  // ──────────────────────────────────────────────────────────────────────────
  socket.on(EVENTS.CONNECT_TRANSPORT, async (payload: any, callback: CB) => {
    try {
      const { roomId, dtlsParameters, direction } = payload;
      const room = getRoom(roomId);
      if (!room) return errAck(callback, "ROOM_NOT_FOUND");

      const peer = getPeer(room, socket.id);
      if (!peer) return errAck(callback, "PEER_NOT_FOUND");

      const transport =
        direction === "send" ? peer.sendTransport : peer.recvTransport;
      if (!transport) return errAck(callback, "TRANSPORT_NOT_FOUND");

      await transport.connect({ dtlsParameters });
      ack(callback, { connected: true });
    } catch (err: any) {
      errAck(callback, err.message);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PRODUCE  (host / guest)
  // payload: { roomId, kind, rtpParameters, appData }
  // ──────────────────────────────────────────────────────────────────────────
  socket.on(EVENTS.PRODUCE, async (payload: any, callback: CB) => {
    try {
      const { roomId, kind, rtpParameters, appData = {} } = payload;
      const room = getRoom(roomId);
      if (!room) return errAck(callback, "ROOM_NOT_FOUND");

      const peer = getPeer(room, socket.id);
      if (!peer || !peer.sendTransport)
        return errAck(callback, "SEND_TRANSPORT_NOT_READY");

      const producer = await peer.sendTransport.produce({
        kind,
        rtpParameters,
        appData,
      });

      peer.producers.set(producer.id, producer);

      producer.on("transportclose", () => {
        peer.producers.delete(producer.id);
      });

      // Notify all other peers in this room about the new producer
      socket.to(roomId).emit(EVENTS.NEW_PRODUCER, {
        producerId: producer.id,
        producerMemberId: memberId,
        kind,
      });

      log.info("[socket] PRODUCE", {
        memberId,
        roomId,
        producerId: producer.id,
        kind,
      });
      ack(callback, { id: producer.id });
    } catch (err: any) {
      errAck(callback, err.message);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CONSUME  (viewers / guests consuming host stream)
  // payload: { roomId, producerId, rtpCapabilities }
  // ──────────────────────────────────────────────────────────────────────────
  socket.on(EVENTS.CONSUME, async (payload: any, callback: CB) => {
    try {
      const { roomId, producerId, rtpCapabilities } = payload;
      const room = getRoom(roomId);
      if (!room) return errAck(callback, "ROOM_NOT_FOUND");

      const peer = getPeer(room, socket.id);
      if (!peer || !peer.recvTransport)
        return errAck(callback, "RECV_TRANSPORT_NOT_READY");

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return errAck(callback, "CANNOT_CONSUME");
      }

      const consumer = await peer.recvTransport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // client must call RESUME_CONSUMER
      });

      peer.consumers.set(consumer.id, consumer);

      consumer.on("transportclose", () =>
        peer.consumers.delete(consumer.id)
      );
      consumer.on("producerclose", () => {
        peer.consumers.delete(consumer.id);
        socket.emit(EVENTS.PRODUCER_CLOSED, { consumerId: consumer.id });
      });

      log.info("[socket] CONSUME", {
        memberId,
        roomId,
        consumerId: consumer.id,
      });
      ack(callback, {
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (err: any) {
      errAck(callback, err.message);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // RESUME_CONSUMER
  // payload: { roomId, consumerId }
  // ──────────────────────────────────────────────────────────────────────────
  socket.on(EVENTS.RESUME_CONSUMER, async (payload: any, callback: CB) => {
    try {
      const { roomId, consumerId } = payload;
      const room = getRoom(roomId);
      if (!room) return errAck(callback, "ROOM_NOT_FOUND");

      const peer = getPeer(room, socket.id);
      if (!peer) return errAck(callback, "PEER_NOT_FOUND");

      const consumer = peer.consumers.get(consumerId);
      if (!consumer) return errAck(callback, "CONSUMER_NOT_FOUND");

      await consumer.resume();
      ack(callback, { resumed: true });
    } catch (err: any) {
      errAck(callback, err.message);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Chat & Reactions (lightweight – no persistence, use Redis PubSub later)
  // ──────────────────────────────────────────────────────────────────────────
  socket.on(EVENTS.SEND_CHAT, (payload: any) => {
    const { roomId, message } = payload;
    if (!roomId || !message) return;
    io.to(roomId).emit(EVENTS.CHAT_MESSAGE, {
      memberId,
      message: String(message).slice(0, 500),
      timestamp: Date.now(),
    });
  });

  socket.on(EVENTS.SEND_REACTION, (payload: any) => {
    const { roomId, emoji } = payload;
    if (!roomId || !emoji) return;
    io.to(roomId).emit(EVENTS.REACTION, {
      memberId,
      emoji: String(emoji).slice(0, 4),
      timestamp: Date.now(),
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // LEAVE_LIVE / disconnect
  // ──────────────────────────────────────────────────────────────────────────
  const handleLeave = () => {
    if (!currentRoomId) return;
    const room = getRoom(currentRoomId);
    if (!room) return;

    const peer = getPeer(room, socket.id);
    const wasHost = peer?.role === "host";

    removePeer(room, socket.id);
    socket.leave(currentRoomId);

    if (wasHost) {
      // End the live session for everyone
      io.to(currentRoomId).emit(EVENTS.LIVE_ENDED, {
        reason: "Host left the stream",
      });
    } else {
      socket.to(currentRoomId).emit(EVENTS.PEER_LEFT, { memberId });
    }

    log.info("[socket] Peer left", { memberId, roomId: currentRoomId });
    currentRoomId = null;
  };

  socket.on(EVENTS.LEAVE_LIVE, handleLeave);
  socket.on("disconnect", handleLeave);
}
