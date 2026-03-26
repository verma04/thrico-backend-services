import { GraphQLError } from "graphql";
import { AuthContext } from "./checkAuth.utils";

export enum AdminModule {
  WEBSITE = "WEBSITE",
  MODERATION = "MODERATION",
  REPORTS = "REPORTS",
  SETTINGS = "GENERAL_SETTINGS",
  SUBSCRIPTION = "SUBSCRIPTION",
  PLATFORM_FEATURES = "PLATFORM_FEATURES",
  APPEARANCE = "APPEARANCE",
  AUDIT_LOGS = "AUDIT_LOGS",
  DOMAIN = "DOMAIN",
  PERMISSIONS = "PERMISSIONS",
  ADMIN_USERS = "ADMIN_USERS",
  BILLING = "BILLING",
  USERS_AND_PERMISSIONS = "USERS_AND_PERMISSIONS",
  TAXES_AND_DUTIES = "TAXES_AND_DUTIES",
  LANGUAGES = "LANGUAGES",
  CUSTOMER_PRIVACY = "CUSTOMER_PRIVACY",
  POLICIES = "POLICIES",
  CONTACT_SUPPORT = "CONTACT_SUPPORT",
  INTEGRATIONS = "INTEGRATIONS",

  // Platform Business Modules
  USERS = "USERS",
  JOBS = "JOBS",
  COMMUNITIES = "COMMUNITIES",
  MARKETPLACE = "MARKETPLACE",
  POLLS = "POLLS",
  SURVEYS = "SURVEYS",
  ANNOUNCEMENTS = "ANNOUNCEMENTS",
  ALUMNI_STORIES = "ALUMNI_STORIES",
  GAMIFICATION = "GAMIFICATION",
  MENTORSHIP = "MENTORSHIP",
  GIVING = "GIVING",
  EVENTS = "EVENTS",
  REWARDS = "REWARDS",
  MOMENTS = "MOMENTS",
  FEED = "FEED",
}

export enum PermissionAction {
  READ = "canRead",
  CREATE = "canCreate",
  EDIT = "canEdit",
  DELETE = "canDelete",
}

export function ensurePermission(
  auth: AuthContext,
  module: AdminModule | string,
  action: PermissionAction,
) {
  // Super Admin bypass
  if (auth.role?.isSystem || auth.role?.name === "Super Admin") {
    return true;
  }

  const permission = auth.role?.permissions?.find(
    (p: any) => p.module === module,
  );

  if (!permission || !permission[action]) {
    throw new GraphQLError(
      `Access Denied: You do not have ${action} permission for the ${module} module.`,
      {
        extensions: {
          code: "FORBIDDEN",
          http: { status: 403 },
        },
      },
    );
  }

  return true;
}
