import * as mediasoup from "mediasoup";

// ─── In-memory live room state ───────────────────────────────────────────────
// (Replace with Redis for multi-node deployments)

export interface Peer {
  socketId: string;
  memberId: string;
  role: "host" | "guest" | "viewer";
  /** send transport (producer side) */
  sendTransport?: mediasoup.types.WebRtcTransport;
  /** recv transport (consumer side) */
  recvTransport?: mediasoup.types.WebRtcTransport;
  producers: Map<string, mediasoup.types.Producer>;
  consumers: Map<string, mediasoup.types.Consumer>;
}

export interface LiveRoom {
  roomId: string;
  router: mediasoup.types.Router;
  peers: Map<string, Peer>; // socketId → Peer
  hostId: string | null;
  startedAt: Date;
}

const rooms = new Map<string, LiveRoom>();

// ─── Room CRUD ───────────────────────────────────────────────────────────────

export function getRoom(roomId: string): LiveRoom | undefined {
  return rooms.get(roomId);
}

export function getOrCreateRoom(
  roomId: string,
  router: mediasoup.types.Router,
  hostId: string | null = null
): LiveRoom {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      router,
      peers: new Map(),
      hostId,
      startedAt: new Date(),
    });
  }
  return rooms.get(roomId)!;
}

export function removeRoom(roomId: string): void {
  rooms.delete(roomId);
}

export function getRooms(): LiveRoom[] {
  return Array.from(rooms.values());
}

// ─── Peer CRUD ───────────────────────────────────────────────────────────────

export function addPeer(room: LiveRoom, peer: Peer): void {
  room.peers.set(peer.socketId, peer);
}

export function getPeer(room: LiveRoom, socketId: string): Peer | undefined {
  return room.peers.get(socketId);
}

export function removePeer(room: LiveRoom, socketId: string): void {
  const peer = room.peers.get(socketId);
  if (!peer) return;

  // Gracefully close all mediasoup resources
  peer.producers.forEach((p) => p.close());
  peer.consumers.forEach((c) => c.close());
  peer.sendTransport?.close();
  peer.recvTransport?.close();

  room.peers.delete(socketId);

  // Clean up empty rooms
  if (room.peers.size === 0) {
    removeRoom(room.roomId);
  }
}
