import { GraphQLError } from "graphql";
import { eq, and } from "drizzle-orm";
import {
  roles as rolesTable,
  modulePermissions as permissionsTable,
  ADMIN,
  ENTITY_MEMBER,
} from "@thrico/database";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { ErrorCode } from "@thrico/shared";
import { log } from "@thrico/logging";
import checkAuth from "../../utils/auth/checkAuth.utils";
import {
  ensurePermission,
  AdminModule,
  PermissionAction,
} from "../../utils/auth/permissions.utils";
import { subscriptionClient } from "@thrico/grpc";

import { createAuditLog } from "../../utils/audit/auditLog.utils";

interface Context {
  headers: {
    authorization?: string;
    [key: string]: any;
  };
  requestId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export const rbacResolvers: any = {
  Query: {
    getRoles: async (_: any, __: any, context: Context) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.PERMISSIONS, PermissionAction.READ);
        const { db, entity } = auth;
        return await db.query.roles.findMany({
          where: (roles: any, { eq }: any) => eq(roles.entityId, entity),
          with: {
            permissions: true,
          },
        });
      } catch (error: any) {
        log.error("Error fetching roles", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to fetch roles");
      }
    },
    getRoleById: async (_: any, { id }: { id: string }, context: Context) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.PERMISSIONS, PermissionAction.READ);
        const { db, entity } = auth;
        return await db.query.roles.findFirst({
          where: (roles: any, { eq, and }: any) =>
            and(eq(roles.id, id), eq(roles.entityId, entity)),
          with: {
            permissions: true,
          },
        });
      } catch (error: any) {
        log.error("Error fetching role by id", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to fetch role");
      }
    },
    getAvailableModules: async (_: any, __: any, context: Context) => {
      try {
        const auth = await checkAuth(context);
        const { entity } = auth;

        // Fetch Business Modules enabled for this entity via subscription
        try {
          const subscription: any =
            await subscriptionClient.checkEntitySubscription(entity);
          const enabledBusinessModules = (subscription.modules || [])
            .filter((m: any) => m.enabled)
            .map((m: any) => m.name.toUpperCase().replace(/\s+/g, "_"));

          return [...enabledBusinessModules];
        } catch (subError) {
          log.error("Error fetching entity subscription for modules", {
            entity,
            error: subError,
          });
          // Fallback to core modules if subscription check fails
          return [];
        }
      } catch (error: any) {
        log.error("Failed to fetch available modules", {
          error: error.message,
        });
        throw new GraphQLError("Failed to fetch modules");
      }
    },
    getAdminUsers: async (_: any, __: any, context: Context) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.ADMIN_USERS, PermissionAction.READ);
        const { entity } = auth;

        // Fetch all members for this entity from ENTITY_MEMBER
        const members = await ENTITY_MEMBER.query("entityId")
          .eq(entity)
          .using("entityIndex")
          .exec();

        // Fetch details for each member from ADMIN table
        const adminsWithDetails = await Promise.all(
          members.map(async (member: any) => {
            const admin = await ADMIN.get(member.userId);
            if (!admin) return null;
            let role;
            if (member?.roleId) {
              role = await auth.db.query.roles.findFirst({
                where: (roles: any, { eq, and }: any) =>
                  and(eq(roles.id, member.roleId)),
                with: {
                  permissions: true,
                },
              });
            }

            return {
              ...admin,
              role,
              roleId: member?.roleId, // Use roleId from membership
              status: member?.status === "active", // Use status from membership as boolean
              memberStatus: member?.status,
              joinedAt: member?.joinedAt,
            };
          }),
        );

        return adminsWithDetails.filter(Boolean).map((admin: any) => ({
          ...admin,
          isSuperAdmin: admin.role === "superAdmin",
        }));
      } catch (error: any) {
        log.error("Error fetching admin users", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to fetch admin users");
      }
    },
  },

  Mutation: {
    async createRole(_: any, { input }: { input: any }, context: Context) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(
          auth,
          AdminModule.PERMISSIONS,
          PermissionAction.CREATE,
        );
        const { db, entity, id: adminId } = auth;
        const { name, description, adminAccess, modulePermissions } = input;

        const [newRole] = await db
          .insert(rolesTable)
          .values({
            name,
            description,
            entityId: entity,
            isSystem: false,
          })
          .returning();

        const allPermissions: any[] = [];

        // Map Admin Access Booleans
        if (adminAccess) {
          const mapping: any = {
            website: AdminModule.WEBSITE,
            moderation: AdminModule.MODERATION,
            reports: AdminModule.REPORTS,
            settings: AdminModule.SETTINGS,
            subscription: AdminModule.SUBSCRIPTION,
            platformFeatures: AdminModule.PLATFORM_FEATURES,
            appearance: AdminModule.APPEARANCE,
            auditLogs: AdminModule.AUDIT_LOGS,
            domain: AdminModule.DOMAIN,
            permissions: AdminModule.PERMISSIONS,
            adminUsers: AdminModule.ADMIN_USERS,
            general: AdminModule.SETTINGS,
            module: AdminModule.PLATFORM_FEATURES,
            billing: AdminModule.BILLING,
            usersAndPermissions: AdminModule.USERS_AND_PERMISSIONS,
            taxesAndDuties: AdminModule.TAXES_AND_DUTIES,
            languages: AdminModule.LANGUAGES,
            customerPrivacy: AdminModule.CUSTOMER_PRIVACY,
            policies: AdminModule.POLICIES,
            contactSupport: AdminModule.CONTACT_SUPPORT,
            integrations: AdminModule.INTEGRATIONS,
          };

          Object.entries(adminAccess).forEach(([key, value]) => {
            if (value && mapping[key]) {
              allPermissions.push({
                roleId: newRole.id,
                module: mapping[key],
                canRead: true,
                canCreate: true,
                canEdit: true,
                canDelete: true,
                entityId: entity,
              });
            }
          });
        }

        // Add Module Permissions Array
        if (modulePermissions && modulePermissions.length > 0) {
          modulePermissions.forEach((p: any) => {
            allPermissions.push({
              roleId: newRole.id,
              module: p.module,
              canRead: p.canRead || false,
              canCreate: p.canCreate || false,
              canEdit: p.canEdit || false,
              canDelete: p.canDelete || false,
              entityId: entity,
            });
          });
        }

        if (allPermissions.length > 0) {
          await db.insert(permissionsTable).values(allPermissions);
        }

        const roleDetails = await db.query.roles.findFirst({
          where: (roles: any, { eq }: any) => eq(roles.id, newRole.id),
          with: { permissions: true },
        });

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.PERMISSIONS,
          action: "CREATE_ROLE",
          resourceId: newRole.id,
          newState: roleDetails,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return roleDetails;
      } catch (error: any) {
        log.error("Error creating role", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to create role");
      }
    },

    async updateRole(_: any, { input }: { input: any }, context: Context) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.PERMISSIONS, PermissionAction.EDIT);
        const { db, entity, id: adminId } = auth;
        const { id, name, description, adminAccess, modulePermissions } = input;

        const previousState = await db.query.roles.findFirst({
          where: (roles: any, { eq, and }: any) =>
            and(eq(roles.id, id), eq(roles.entityId, entity)),
          with: { permissions: true },
        });

        await db
          .update(rolesTable)
          .set({ name, description, updatedAt: new Date() })
          .where(and(eq(rolesTable.id, id), eq(rolesTable.entityId, entity)));

        const allPermissions: any[] = [];

        // Map Admin Access Booleans
        if (adminAccess) {
          const mapping: any = {
            website: AdminModule.WEBSITE,
            moderation: AdminModule.MODERATION,
            reports: AdminModule.REPORTS,
            settings: AdminModule.SETTINGS,
            subscription: AdminModule.SUBSCRIPTION,
            platformFeatures: AdminModule.PLATFORM_FEATURES,
            appearance: AdminModule.APPEARANCE,
            auditLogs: AdminModule.AUDIT_LOGS,
            domain: AdminModule.DOMAIN,
            permissions: AdminModule.PERMISSIONS,
            adminUsers: AdminModule.ADMIN_USERS,
            general: AdminModule.SETTINGS,
            module: AdminModule.PLATFORM_FEATURES,
            billing: AdminModule.BILLING,
            usersAndPermissions: AdminModule.USERS_AND_PERMISSIONS,
            taxesAndDuties: AdminModule.TAXES_AND_DUTIES,
            languages: AdminModule.LANGUAGES,
            customerPrivacy: AdminModule.CUSTOMER_PRIVACY,
            policies: AdminModule.POLICIES,
            contactSupport: AdminModule.CONTACT_SUPPORT,
            integrations: AdminModule.INTEGRATIONS,
          };

          Object.entries(adminAccess).forEach(([key, value]) => {
            if (value && mapping[key]) {
              allPermissions.push({
                roleId: id,
                module: mapping[key],
                canRead: true,
                canCreate: true,
                canEdit: true,
                canDelete: true,
                entityId: entity,
              });
            }
          });
        }

        // Add Module Permissions Array
        if (modulePermissions && modulePermissions.length > 0) {
          modulePermissions.forEach((p: any) => {
            allPermissions.push({
              roleId: id,
              module: p.module,
              canRead: p.canRead || false,
              canCreate: p.canCreate || false,
              canEdit: p.canEdit || false,
              canDelete: p.canDelete || false,
              entityId: entity,
            });
          });
        }

        if (allPermissions.length > 0 || adminAccess) {
          await db
            .delete(permissionsTable)
            .where(eq(permissionsTable.roleId, id));

          if (allPermissions.length > 0) {
            await db.insert(permissionsTable).values(allPermissions);
          }
        }

        const newState = await db.query.roles.findFirst({
          where: (roles: any, { eq }: any) => eq(roles.id, id),
          with: { permissions: true },
        });

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.PERMISSIONS,
          action: "UPDATE_ROLE",
          resourceId: id,
          previousState,
          newState,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return newState;
      } catch (error: any) {
        log.error("Error updating role", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to update role");
      }
    },

    async deleteRole(_: any, { id }: { id: string }, context: Context) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(
          auth,
          AdminModule.PERMISSIONS,
          PermissionAction.DELETE,
        );
        const { db, entity, id: adminId } = auth;

        const role = await db.query.roles.findFirst({
          where: (roles: any, { eq, and }: any) =>
            and(eq(roles.id, id), eq(roles.entityId, entity)),
          with: { permissions: true },
        });

        if (!role) {
          throw new GraphQLError("Role not found");
        }

        if (role.isSystem) {
          throw new GraphQLError("System roles cannot be deleted");
        }

        await db
          .delete(rolesTable)
          .where(and(eq(rolesTable.id, id), eq(rolesTable.entityId, entity)));

        await createAuditLog(db, {
          adminId,
          entityId: entity,
          module: AdminModule.PERMISSIONS,
          action: "DELETE_ROLE",
          resourceId: id,
          previousState: role,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return { success: true };
      } catch (error: any) {
        log.error("Error deleting role", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to delete role");
      }
    },
    createAdmin: async (
      _: any,
      { input }: { input: any },
      context: Context,
    ) => {
      try {
        const auth = await checkAuth(context);
        ensurePermission(
          auth,
          AdminModule.ADMIN_USERS,
          PermissionAction.CREATE,
        );
        const { entity, id: requesterId, db } = auth;
        const { firstName, lastName, email, phone, roleId } = input;

        // Check if global admin user already exists
        const adminUsers = await ADMIN.query("email")
          .eq(email)
          .using("EmailIndex")
          .exec();

        let adminUser;
        if (adminUsers.count > 0) {
          adminUser = adminUsers[0];
          // Check if already a member of this entity
          const memberships = await ENTITY_MEMBER.query("userId")
            .eq(adminUser.id)
            .using("userIndex")
            .exec();

          const isAlreadyMember = memberships.some(
            (m: any) => m.entityId === entity,
          );
          if (isAlreadyMember) {
            return new GraphQLError(
              "User is already a member of this workspace",
            );
          }
        } else {
          // Create new global admin user
          adminUser = await ADMIN.create({
            id: uuidv4(),
            firstName,
            lastName,
            email,
            phone,

            isEntityCreated: true,
            status: true,
          });
        }

        // Create Entity Membership link
        const membership = await ENTITY_MEMBER.create({
          id: uuidv4(),
          userId: adminUser.id,
          entityId: entity,
          status: "active",

          roleId: roleId,
          invitedBy: requesterId,
          joinedAt: new Date(),
        });

        await createAuditLog(db, {
          adminId: requesterId,
          entityId: entity,
          module: AdminModule.ADMIN_USERS,
          action: "ADD_ADMIN",
          resourceId: adminUser.id,
          newState: { ...adminUser, membership },
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return {
          ...adminUser,
          status: true,
        };
      } catch (error: any) {
        log.error("Create admin error", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to create admin");
      }
    },
    async updateAdminUserRole(
      _: any,
      { adminId, roleId }: { adminId: string; roleId: string },
      context: Context,
    ) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.ADMIN_USERS, PermissionAction.EDIT);
        const { entity, db, id: requesterId } = auth;

        // Verify the admin belongs to the same entity via ENTITY_MEMBER
        const memberships = await ENTITY_MEMBER.query("userId")
          .eq(adminId)
          .exec();
        const membership = memberships.find((m: any) => m.entityId === entity);

        if (!membership) {
          throw new GraphQLError("Admin user not found in your workspace");
        }

        const previousState = { ...membership };

        // Update the role in ENTITY_MEMBER
        const updatedMembership = await ENTITY_MEMBER.update(
          { id: membership.id },
          { roleId },
        );

        const admin = await ADMIN.get(adminId);

        await createAuditLog(db, {
          adminId: requesterId,
          entityId: entity,
          module: AdminModule.ADMIN_USERS,
          action: "UPDATE_ADMIN_ROLE",
          resourceId: adminId,
          previousState,
          newState: updatedMembership,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return {
          ...admin,
          roleId,
          status: membership.status === "active",
        };
      } catch (error: any) {
        log.error("Error updating admin user role", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to update admin role");
      }
    },

    async deleteAdminUser(
      _: any,
      { adminId }: { adminId: string },
      context: Context,
    ) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(
          auth,
          AdminModule.ADMIN_USERS,
          PermissionAction.DELETE,
        );
        const { id: requesterId, entity, db } = auth;

        if (requesterId === adminId) {
          throw new GraphQLError("You cannot delete yourself");
        }

        // Verify the admin belongs to the same entity via ENTITY_MEMBER
        const memberships = await ENTITY_MEMBER.query("userId")
          .eq(adminId)
          .exec();
        const membership = memberships.find((m: any) => m.entityId === entity);

        if (!membership) {
          throw new GraphQLError("Admin user not found in your workspace");
        }

        // Check if target is the owner of the entity
        const entityRecord = await db.query.entity.findFirst({
          where: (e: any, { eq }: any) => eq(e.id, entity),
        });

        if (entityRecord && entityRecord.userId === adminId) {
          throw new GraphQLError("Owner of the entity cannot be deleted");
        }

        // Delete the membership link instead of the global admin user
        await ENTITY_MEMBER.delete({ id: membership.id });

        await createAuditLog(db, {
          adminId: requesterId,
          entityId: entity,
          module: AdminModule.ADMIN_USERS,
          action: "REMOVE_ADMIN",
          resourceId: adminId,
          previousState: membership,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return { success: true };
      } catch (error: any) {
        log.error("Error deleting admin user", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to delete admin user");
      }
    },

    async updateAdminUser(
      _: any,
      { adminId, input }: { adminId: string; input: any },
      context: Context,
    ) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.ADMIN_USERS, PermissionAction.EDIT);
        const { entity, db, id: requesterId } = auth;

        // Verify the admin belongs to the same entity via ENTITY_MEMBER
        const memberships = await ENTITY_MEMBER.query("userId")
          .eq(adminId)
          .exec();
        const membership = memberships.find((m: any) => m.entityId === entity);

        if (!membership) {
          throw new GraphQLError("Admin user not found in your workspace");
        }

        const admin = await ADMIN.get(adminId);
        const previousState = { ...admin, membership };

        // Update admin info (global properties)
        const updatedAdmin = await ADMIN.update(
          { id: adminId },
          {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
          },
        );

        let updatedMembership = membership;
        // Update membership status if applicable
        if (input.status !== undefined) {
          const newStatus = input.status ? "active" : "removed";
          updatedMembership = await ENTITY_MEMBER.update(
            { id: membership.id },
            { status: newStatus },
          );
        }

        await createAuditLog(db, {
          adminId: requesterId,
          entityId: entity,
          module: AdminModule.ADMIN_USERS,
          action: "UPDATE_ADMIN",
          resourceId: adminId,
          previousState,
          newState: { ...updatedAdmin, updatedMembership },
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return {
          ...updatedAdmin,
          status:
            input.status !== undefined
              ? input.status
              : membership.status === "active",
        };
      } catch (error: any) {
        log.error("Error updating admin user", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to update admin user");
      }
    },

    async updateAdminPassword(
      _: any,
      { adminId, password }: { adminId: string; password: string },
      context: Context,
    ) {
      try {
        const auth = await checkAuth(context);
        ensurePermission(auth, AdminModule.ADMIN_USERS, PermissionAction.EDIT);
        const { entity, db, id: requesterId } = auth;

        // Verify the admin belongs to the same entity via ENTITY_MEMBER
        const memberships = await ENTITY_MEMBER.query("userId")
          .eq(adminId)
          .exec();
        const isMember = memberships.some((m: any) => m.entityId === entity);

        if (!isMember) {
          throw new GraphQLError("Admin user not found in your workspace");
        }

        const hashPassword = await bcrypt.hash(password, 10);
        await ADMIN.update({ id: adminId }, { password: hashPassword });

        await createAuditLog(db, {
          adminId: requesterId,
          entityId: entity,
          module: AdminModule.ADMIN_USERS,
          action: "UPDATE_ADMIN_PASSWORD",
          resourceId: adminId,
          ipAddress: context.ip,
          userAgent: context.userAgent,
        });

        return { success: true };
      } catch (error: any) {
        log.error("Error updating admin password", { error: error.message });
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError("Failed to update admin password");
      }
    },
  },

  AdminUser: {
    role: async (parent: any, _: any, context: Context) => {
      try {
        if (parent.role) return parent.role;
        if (!parent.roleId) return null;
        const { db } = await checkAuth(context);

        return await db.query.roles.findFirst({
          where: (roles: any, { eq }: any) => eq(roles.id, parent.roleId),
          with: { permissions: true },
        });
      } catch (error) {
        log.error("Error resolving AdminUser.role", { error });
        return null;
      }
    },
    permissions: async (parent: any, _: any, context: Context) => {
      try {
        let role = parent.role;
        if (!role && parent.roleId) {
          const { db } = await checkAuth(context);
          role = await db.query.roles.findFirst({
            where: (roles: any, { eq }: any) => eq(roles.id, parent.roleId),
            with: { permissions: true },
          });
        }
        if (!role) return null;

        return rbacResolvers.Role.adminAccess(role);
      } catch (error) {
        log.error("Error resolving AdminUser.permissions", { error });
        return null;
      }
    },
    modulePermissions: async (parent: any, _: any, context: Context) => {
      try {
        let role = parent.role;
        if (!role && parent.roleId) {
          const { db } = await checkAuth(context);
          role = await db.query.roles.findFirst({
            where: (roles: any, { eq }: any) => eq(roles.id, parent.roleId),
            with: { permissions: true },
          });
        }
        if (!role) return null;

        return rbacResolvers.Role.modulePermissions(role);
      } catch (error) {
        log.error("Error resolving AdminUser.modulePermissions", { error });
        return null;
      }
    },
    isSuperAdmin: async (parent: any, _: any, context: Context) => {
      try {
        if (parent.role === "superAdmin") return true;
        if (!parent.roleId) return false;

        const { db } = await checkAuth(context);
        const role = await db.query.roles.findFirst({
          where: (roles: any, { eq }: any) => eq(roles.id, parent.roleId),
        });

        return role?.isSystem || false;
      } catch (error) {
        return parent.role === "superAdmin";
      }
    },
  },

  Role: {
    adminAccess: (parent: any) => {
      const perms = parent.permissions || [];
      return {
        website: perms.some((p: any) => p.module === AdminModule.WEBSITE),
        moderation: perms.some((p: any) => p.module === AdminModule.MODERATION),
        reports: perms.some((p: any) => p.module === AdminModule.REPORTS),
        settings: perms.some((p: any) => p.module === AdminModule.SETTINGS),
        subscription: perms.some(
          (p: any) => p.module === AdminModule.SUBSCRIPTION,
        ),
        platformFeatures: perms.some(
          (p: any) => p.module === AdminModule.PLATFORM_FEATURES,
        ),
        appearance: perms.some((p: any) => p.module === AdminModule.APPEARANCE),
        auditLogs: perms.some((p: any) => p.module === AdminModule.AUDIT_LOGS),
        domain: perms.some((p: any) => p.module === AdminModule.DOMAIN),
        permissions: perms.some(
          (p: any) => p.module === AdminModule.PERMISSIONS,
        ),
        adminUsers: perms.some(
          (p: any) => p.module === AdminModule.ADMIN_USERS,
        ),
        general: perms.some((p: any) => p.module === AdminModule.SETTINGS),
        module: perms.some(
          (p: any) => p.module === AdminModule.PLATFORM_FEATURES,
        ),
        billing: perms.some((p: any) => p.module === AdminModule.BILLING),
        usersAndPermissions: perms.some(
          (p: any) => p.module === AdminModule.USERS_AND_PERMISSIONS,
        ),
        taxesAndDuties: perms.some(
          (p: any) => p.module === AdminModule.TAXES_AND_DUTIES,
        ),
        languages: perms.some((p: any) => p.module === AdminModule.LANGUAGES),
        customerPrivacy: perms.some(
          (p: any) => p.module === AdminModule.CUSTOMER_PRIVACY,
        ),
        policies: perms.some((p: any) => p.module === AdminModule.POLICIES),
        contactSupport: perms.some(
          (p: any) => p.module === AdminModule.CONTACT_SUPPORT,
        ),
        integrations: perms.some(
          (p: any) => p.module === AdminModule.INTEGRATIONS,
        ),
      };
    },
    modulePermissions: (parent: any) => {
      const perms = parent.permissions || [];
      const coreModules = [
        AdminModule.WEBSITE,
        AdminModule.MODERATION,
        AdminModule.REPORTS,
        AdminModule.SETTINGS,
        AdminModule.SUBSCRIPTION,
        AdminModule.PLATFORM_FEATURES,
        AdminModule.APPEARANCE,
        AdminModule.AUDIT_LOGS,
        AdminModule.DOMAIN,
        AdminModule.PERMISSIONS,
        AdminModule.ADMIN_USERS,
        AdminModule.BILLING,
        AdminModule.USERS_AND_PERMISSIONS,
        AdminModule.TAXES_AND_DUTIES,
        AdminModule.LANGUAGES,
        AdminModule.CUSTOMER_PRIVACY,
        AdminModule.POLICIES,
        AdminModule.CONTACT_SUPPORT,
        AdminModule.INTEGRATIONS,
      ];
      return perms.filter((p: any) => !coreModules.includes(p.module));
    },
  },
};
