import {
  aboutUser,
  connections,
  eventTeams,
  user,
  userToEntity,
} from "@thrico/database";

import { log } from "@thrico/logging";
import { sql, eq, and, or } from "drizzle-orm";

interface AddTeamMemberInput {
  eventId: string;
  memberData: Record<string, any>;
}

interface RemoveTeamMemberInput {
  eventId: string;
  memberId: string;
}

type EventTeamRole =
  | "ORGANIZER"
  | "CO_ORGANIZER"
  | "VOLUNTEER"
  | "SPEAKER_MANAGER"
  | "LOGISTICS"
  | "MARKETING"
  | "TECH_SUPPORT"
  | "OTHER";

interface GetTeamOptions {
  eventId: string;
  role?: EventTeamRole;
  page?: number;
  limit?: number;
}

// Define permissions for each role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ORGANIZER: [
    "manage_event",
    "manage_team",
    "edit_event",
    "delete_event",
    "view_reports",
    "invite_members",
    "assign_roles",
  ],
  CO_ORGANIZER: ["manage_team", "edit_event", "view_reports", "invite_members"],
  VOLUNTEER: ["view_event", "assist_tasks"],
  SPEAKER_MANAGER: ["manage_speakers", "view_event"],
  LOGISTICS: ["manage_logistics", "view_event"],
  MARKETING: ["manage_marketing", "view_event"],
  TECH_SUPPORT: ["manage_tech", "view_event"],
  OTHER: ["view_event"],
};

// Optionally, group permissions for UI or logic
const GROUPED_PERMISSIONS = {
  event: ["manage_event", "edit_event", "delete_event", "view_event"],
  team: ["manage_team", "invite_members", "assign_roles"],
  speakers: ["manage_speakers"],
  logistics: ["manage_logistics"],
  marketing: ["manage_marketing"],
  tech: ["manage_tech"],
  reports: ["view_reports"],
  tasks: ["assist_tasks"],
};

export class EventTeamService {
  constructor(private db: any) {}

  async addTeamMember({
    eventId,
    memberData,
  }: AddTeamMemberInput & { role: EventTeamRole }) {
    try {
      const [result] = await this.db
        .insert(eventTeams)
        .values({
          ...memberData,
          eventId,
          role: memberData.role, // Ensure role is included in memberData
        })
        .returning();

      // Get permissions for the assigned role
      const permissions = ROLE_PERMISSIONS[memberData.role] || [];

      console.log("Added Team Member:", result);
      return {
        ...result,
        permissions,
      };
    } catch (error) {
      log.error("Error adding team member", { error });
      throw error;
    }
  }

  async getTeamByEvent(options: GetTeamOptions) {
    const { eventId, role, page = 1, limit = 20 } = options;

    try {
      let whereClause: any = eq(eventTeams.eventId, eventId);
      if (role) {
        whereClause = and(whereClause, eq(eventTeams.role, role));
      }

      const members = await this.db.query.eventTeams.findMany({
        where: whereClause,
        limit,
        offset: (page - 1) * limit,
      });

      return {
        members,
        pagination: {
          page,
          limit,
          count: members.length,
        },
      };
    } catch (error) {
      log.error("Error fetching team members", { error });
      throw error;
    }
  }

  async removeTeamMember({ eventId, memberId }: RemoveTeamMemberInput) {
    try {
      await this.db
        .delete(eventTeams)
        .where(
          and(eq(eventTeams.eventId, eventId), eq(eventTeams.id, memberId))
        );
      console.log(`Removed team member ${memberId} from event ${eventId}`);
      return { success: true, message: "Team member removed successfully" };
    } catch (error) {
      log.error("Error removing team member", { error });
      throw error;
    }
  }

  async editTeamMember(
    eventId: string,
    memberId: string,
    updateData: Record<string, any>
  ) {
    try {
      const [result] = await this.db
        .update(eventTeams)
        .set(updateData)
        .where(
          and(eq(eventTeams.eventId, eventId), eq(eventTeams.id, memberId))
        )
        .returning();
      return result;
    } catch (error) {
      log.error("Error editing team member", { error });
      throw error;
    }
  }

  /**
   * Get all event team roles with their permissions
   */
  getRolesWithPermissions() {
    return Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({
      role,
      permissions,
    }));
  }

  /**
   * Get grouped permissions (for UI or logic)
   */
  getGroupedPermissions() {
    return GROUPED_PERMISSIONS;
  }

  /**
   * Get the role of a specific user for a given event
   */
  async getMemberRole(
    eventId: string,
    userId: string
  ): Promise<EventTeamRole | null> {
    try {
      const member = await this.db.query.eventTeams.findFirst({
        where: and(
          eq(eventTeams.eventId, eventId),
          eq(eventTeams.userId, userId)
        ),
      });
      return member ? (member.role as EventTeamRole) : null;
    } catch (error) {
      log.error("Error fetching team member role", { error });
      throw error;
    }
  }

  /**
   * Get the permissions for a specific user in an event, based on their role
   */
  async getMemberPermissions(
    eventId: string,
    userId: string
  ): Promise<string[] | null> {
    try {
      const role = await this.getMemberRole(eventId, userId);
      if (!role) return null;
      return ROLE_PERMISSIONS[role] || [];
    } catch (error) {
      log.error("Error fetching team member permissions", { error });
      throw error;
    }
  }

  /**
   * Search connections for adding as event team members,
   * and mark if each user is already a member of the event team.
   */
  async searchConnectionsForEventTeam({
    currentUserId,
    entityId,
    eventId,
    limit = 10,
    offset = 0,
    search = "",
  }: {
    currentUserId: string;
    entityId: string;
    eventId: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    const searchCondition = search
      ? sql`(
          LOWER(${user.firstName}) LIKE LOWER(${`%${search}%`}) OR
          LOWER(${user.lastName}) LIKE LOWER(${`%${search}%`}) OR
          LOWER(CONCAT(${user.firstName}, ' ', ${
          user.lastName
        })) LIKE LOWER(${`%${search}%`})
        )`
      : sql`true`;

    // Get connections
    const data = await this.db
      .select({
        id: userToEntity.id,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        // cover: user.cover,
        designation: aboutUser.headline,
        isOnline:
          sql`CASE WHEN ${userToEntity.lastActive} + interval '10 minutes' > now() THEN true ELSE false END`.as(
            "is_online"
          ),
        connectedAt: connections.createdAt,
        status: sql<string>`'CONNECTED'`.as("status"),
      })
      .from(connections)
      .innerJoin(
        userToEntity,
        or(
          and(
            eq(connections.user1, currentUserId),
            eq(connections.user2, userToEntity.id)
          ),
          and(
            eq(connections.user2, currentUserId),
            eq(connections.user1, userToEntity.id)
          )
        )
      )
      .innerJoin(user, eq(userToEntity.userId, user.id))
      .leftJoin(aboutUser, eq(userToEntity.userId, aboutUser.userId))

      .where(
        and(
          eq(connections.entity, entityId),
          eq(connections.connectionStatusEnum, "ACCEPTED"),

          searchCondition
        )
      )
      .limit(limit + 1)
      .offset(offset);

    // Get all userIds in this page
    const userIds = data.map((u: any) => u.userId);

    const teamMembers = await this.db.query.eventTeams.findMany({
      where: and(eq(eventTeams.eventId, eventId)),
      columns: { userId: true },
    });

    console.log("Team Members:", teamMembers);

    const teamMemberIds = new Set(teamMembers.map((tm: any) => tm.userId));

    // Add isMember boolean to each result
    const results = data.slice(0, limit).map((u: any) => ({
      ...u,
      isMember: teamMemberIds.has(u.userId),
    }));

    return {
      data: results,
      pagination: {
        total: null, // Set if you want to count total
        limit,
        offset,
        hasMore: data.length > limit,
      },
    };
  }
}
