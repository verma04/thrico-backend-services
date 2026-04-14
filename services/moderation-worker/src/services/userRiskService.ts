import {
  AppDatabase,
  userRiskProfiles,
  userToEntity,
  user,
  ENTITY_MEMBER,
  ADMIN,
  EntityMemberRole,
  moderationLogs,
  entity as entityTable,
} from "@thrico/database";
import { eq, sql, and } from "drizzle-orm";
import { log } from "@thrico/logging";
import { EmailService, NotificationService } from "@thrico/services";

export class UserRiskService {
  static async updateUserRisk(
    db: AppDatabase,
    userId: string,
    entityId: string,
    action: "WARNING" | "BLOCK" | "SUSPEND" | "FLAG",
  ) {
    try {
      const existingProfile = await db.query.userRiskProfiles.findFirst({
        where: (ur, { and, eq }) =>
          and(eq(ur.userId, userId), eq(ur.entityId, entityId)),
      });

      if (!existingProfile) {
        await db.insert(userRiskProfiles).values({
          userId,
          entityId,
          warningCount: action === "WARNING" ? 1 : 0,
          blockedContentCount: action === "BLOCK" ? 1 : 0,
          riskScore:
            action === "SUSPEND"
              ? "100.0"
              : action === "BLOCK"
                ? "10.0"
                : action === "WARNING"
                  ? "5.0"
                  : "2.0",
          status: action === "SUSPEND" ? "SUSPENDED" : "ACTIVE",
          lastViolationAt: new Date(),
        });
      } else {
        const updateData: any = {
          lastViolationAt: new Date(),
          status: action === "SUSPEND" ? "SUSPENDED" : existingProfile.status,
        };

        if (action === "WARNING") {
          updateData.warningCount = sql`${userRiskProfiles.warningCount} + 1`;
          updateData.riskScore = sql`${userRiskProfiles.riskScore} + 5`;
        } else if (action === "BLOCK") {
          updateData.blockedContentCount = sql`${userRiskProfiles.blockedContentCount} + 1`;
          updateData.riskScore = sql`${userRiskProfiles.riskScore} + 10`;
        } else if (action === "SUSPEND") {
          updateData.riskScore = "100.0";
        } else if (action === "FLAG") {
          updateData.riskScore = sql`${userRiskProfiles.riskScore} + 2`;
        }

        await db
          .update(userRiskProfiles)
          .set(updateData)
          .where(eq(userRiskProfiles.id, existingProfile.id));
      }
      if (action === "WARNING" || action === "BLOCK" || action === "SUSPEND") {
        // Fetch the updated profile to check the warning count
        const updatedProfile = await db.query.userRiskProfiles.findFirst({
          where: (ur, { and: qAnd, eq: qEq }) =>
            qAnd(qEq(ur.userId, userId), qEq(ur.entityId, entityId)),
        });

        // If action was BLOCK or SUSPEND, or if warnings > 3, block the user from the entity
        if (
          action === "BLOCK" ||
          action === "SUSPEND" ||
          (updatedProfile &&
            updatedProfile.warningCount !== null &&
            updatedProfile.warningCount > 3)
        ) {
          log.info(
            `Blocking user from entity due to high risk or explicit block/suspend`,
            { userId, entityId, warningCount: updatedProfile?.warningCount },
          );
          await db
            .update(userToEntity)
            .set({ status: "BLOCKED" })
            .where(
              and(
                eq(userToEntity.userId, userId),
                eq(userToEntity.entityId, entityId),
              ),
            );

          // Track the block action in moderation logs
          await db.insert(moderationLogs).values({
            userId,
            entityId,
            contentId: userId,
            contentType: "USER",
            decision: action === "SUSPEND" ? "SUSPEND" : "BLOCK",
            actionTaken: `User ${
              action === "SUSPEND" ? "suspended" : "blocked"
            } from entity due to ${
              action === "BLOCK" || action === "SUSPEND"
                ? "explicit moderation action"
                : "exceeding warning threshold (>3 warnings)"
            }`,
          });
        } else if (action === "WARNING" || action === "FLAG") {
          // Set user status to FLAGGED for warnings or flags
          log.info(`Flagging user in entity due to moderation action`, {
            userId,
            entityId,
          });
          await db
            .update(userToEntity)
            .set({ status: "FLAGGED" })
            .where(
              and(
                eq(userToEntity.userId, userId),
                eq(userToEntity.entityId, entityId),
              ),
            );
        }
      }

      log.info(`Updated user risk profile: ${action}`, { userId });

      // 4. Send notifications
      try {
        const userData = await db.query.user.findFirst({
          where: eq(user.id, userId),
          columns: { email: true, firstName: true },
        });

        // 4a. Email the affected user
        if (userData?.email) {
          await EmailService.sendEmail({
            db,
            entityId,
            input: {
              to: userData.email,
              subject: `Moderation Action: ${action}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h2 style="color: #ef4444;">Moderation Update</h2>
                  <p>Hello ${userData.firstName},</p>
                  <p>We've taken a moderation action on your account: <strong>${action}</strong>.</p>
                  <p>Reason: Violation of community guidelines.</p>
                  <p>Specifically, your content was flagged for high-risk categories such as harassment or offensive behavior.</p>
                  <p>Account Status: ${action === "SUSPEND" ? "Suspended" : "Active (under warning)"}</p>
                  <p>If you believe this was a mistake, please reach out to our support team.</p>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #94a3b8;">This is an automated message from the Thrico Network Moderation System.</p>
                </div>
              `,
            },
          });
          log.info("Moderation email sent to user successfully", { userId, action });
        }

        // 4b. Alert all entity admins
        const entityData = await db.query.entity.findFirst({
          where: eq(entityTable.id, entityId),
          columns: { name: true, logo: true },
        });

        await UserRiskService.notifyAdmins({ db, entityId, action, userData, userId, entityData });

        // 5. Send Push Notification to user
        await NotificationService.sendPushNotification({
          userId,
          entityId,
          title: "Account Moderation Update",
          body: `A moderation action (${action}) has been taken on your account due to community guideline violations.`,
          payload: {
            type: "MODERATION",
            action,
          },
        }).catch((err: any) =>
          log.error("Failed to send moderation push notification", {
            error: err.message,
            userId,
          }),
        );
      } catch (error: any) {
        log.error("Failed to send moderation notifications", {
          error: error.message,
          userId,
        });
      }
    } catch (error: any) {
      log.error("Failed to update user risk profile", { error: error.message });
    }
  }

  /**
   * Sends a moderation alert email to all entity admins (role: admin | superAdmin).
   */
  static async notifyAdmins({
    db,
    entityId,
    action,
    userData,
    userId,
    entityData,
  }: {
    db: AppDatabase;
    entityId: string;
    action: "WARNING" | "BLOCK" | "SUSPEND" | "FLAG";
    userData: { email?: string | null; firstName?: string | null } | null | undefined;
    userId: string;
    entityData?: { name: string; logo: string } | null;
  }): Promise<void> {
    try {
      const entityMembers = await ENTITY_MEMBER.query("entityId")
        .eq(entityId)
        .using("entityIndex")
        .exec();

      // Only notify members whose role is admin or superAdmin
      const adminMembers = entityMembers.filter(
        (m: any) => m.role === "admin" || m.role === "superAdmin",
      );

      if (adminMembers.length === 0) {
        log.info("No admin members found to notify", { entityId });
        return;
      }

      const actionColors: Record<string, string> = {
        WARNING: "#f59e0b",
        BLOCK: "#ef4444",
        SUSPEND: "#7c3aed",
        FLAG: "#3b82f6",
      };
      const accentColor = actionColors[action] ?? "#64748b";

      await Promise.allSettled(
        adminMembers.map(async (member: any) => {
          const adminRecord = await ADMIN.get(member.userId);
          if (!adminRecord?.email) return;

          await EmailService.sendEmail({
            db,
            entityId,
            input: {
              to: adminRecord.email,
              subject: `[Admin Alert] ${entityData?.name ?? "Thrico"} Moderation Action: ${action} on ${userData?.firstName ?? userId}`,
              html: `
                <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                   ${
                     entityData?.logo
                       ? `<div style="margin-bottom: 24px;">
                            <img src="${entityData.logo}" alt="${entityData.name}" style="height: 40px; object-fit: contain;" />
                          </div>`
                       : ""
                   }
                  <div style="border-left: 4px solid ${accentColor}; padding-left: 16px; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: ${accentColor}; font-size: 20px;">Moderation Alert</h2>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Entity: <strong>${entityData?.name ?? entityId}</strong></p>
                  </div>
                  
                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                      <tr>
                        <td style="padding: 10px 0; color: #94a3b8; width: 35%; border-bottom: 1px solid #e2e8f0;">Action Taken</td>
                        <td style="padding: 10px 0; font-weight: 600; color: ${accentColor}; border-bottom: 1px solid #e2e8f0;">${action}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid #e2e8f0;">Affected User</td>
                        <td style="padding: 10px 0; color: #1e293b; border-bottom: 1px solid #e2e8f0;">
                          ${userData?.firstName ?? "User"} (${userData?.email ?? userId})
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid #e2e8f0;">Reason</td>
                        <td style="padding: 10px 0; color: #1e293b; border-bottom: 1px solid #e2e8f0;">Community Guideline Violation</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #94a3b8;">Timestamp</td>
                        <td style="padding: 10px 0; color: #1e293b;">${new Date().toLocaleString()}</td>
                      </tr>
                    </table>
                  </div>

                  <div style="text-align: center;">
                    <p style="font-size: 12px; color: #94a3b8; margin: 0;">&copy; ${new Date().getFullYear()} ${entityData?.name ?? "Thrico Network"}. All rights reserved.</p>
                  </div>
                </div>
              `,
            },
          });
        }),
      );

      log.info("Admin moderation alert emails sent", {
        entityId,
        action,
        count: adminMembers.length,
      });
    } catch (err: any) {
      log.error("Failed to send admin moderation alert emails", {
        error: err.message,
        entityId,
      });
    }
  }
}
