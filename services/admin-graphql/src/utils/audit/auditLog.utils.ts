import { adminAuditLogs } from "@thrico/database";

export interface AuditLogInput {
  adminId: string;
  entityId: string;
  module: string;
  action: string;
  resourceId?: string;
  targetUserId?: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(db: any, input: AuditLogInput) {
  try {
    await db.insert(adminAuditLogs).values({
      ...input,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // We don't throw here to avoid failing the main action if audit logging fails
  }
}
