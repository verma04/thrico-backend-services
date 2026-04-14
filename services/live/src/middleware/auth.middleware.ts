import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_TOKEN } from "../config";
import { log } from "@thrico/logging";

export interface AuthPayload {
  memberId: string;
  tenantId: string;
  role?: string;
}

/**
 * Socket.IO middleware: validates the Bearer JWT passed in
 * socket.handshake.auth.token or Authorization header.
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  try {
    const token: string | undefined =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("AUTH_MISSING_TOKEN"));
    }

    const payload = jwt.verify(token, JWT_TOKEN) as AuthPayload;
    (socket as any).user = payload;

    log.info("[auth] Socket authenticated", {
      memberId: payload.memberId,
      socketId: socket.id,
    });

    next();
  } catch (err) {
    log.warn("[auth] Socket auth failed", { error: (err as Error).message });
    next(new Error("AUTH_INVALID_TOKEN"));
  }
}

/** Helper to pull the verified user off a socket */
export function getSocketUser(socket: Socket): AuthPayload {
  return (socket as any).user as AuthPayload;
}
