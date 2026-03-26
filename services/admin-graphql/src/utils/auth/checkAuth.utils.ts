import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import { ADMIN, AppDatabase, ENTITY_MEMBER, getDb } from "@thrico/database";
import { DatabaseRegion, JWTPayload, ENV } from "@thrico/shared";
import { entityClient } from "@thrico/grpc";
import { decryptToken } from "../crypto/jwt.crypto";

export type AuthContext = {
  id: string; // Map to admin.id
  userId: string; // from JWT
  token: string;
  entity: string;
  entityId?: string; // from JWT/Admin
  db: AppDatabase;
  country: DatabaseRegion;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: {
    id: string;
    name: string;
    isSystem: boolean;
    permissions: any[];
  };
} & Partial<JWTPayload>;

const throwForbidden = (message = "Permission Denied") => {
  throw new GraphQLError(message, {
    extensions: { code: "FORBIDDEN", http: { status: 403 } },
  });
};

const checkAuth = async (context: any): Promise<AuthContext> => {
  const authHeaderRaw = context.headers?.authorization;

  if (!authHeaderRaw) throwForbidden();

  const authHeader = await decryptToken(authHeaderRaw);
  if (!authHeader) throwForbidden();

  const token = authHeader.split("Bearer ")[1];
  if (!token) throwForbidden();

  try {
    const decoded = jwt.verify(token, String(ENV.JWT_SECRET)) as JWTPayload;

    let entityMembers = await ENTITY_MEMBER.query("userId")
      .eq(decoded.userId)
      .using("userIndex")
      .filter("entityId")
      .eq(decoded.entityId)
      .exec();

    if (!entityMembers || entityMembers.length === 0) {
      throwForbidden("User is not a member of any entity");
    }

    const admin = await ADMIN.get(entityMembers[0].userId);

    if (!admin) {
      throwForbidden("User not found");
    }

    // Determine the active membership
    const activeMember = decoded.entityId ? entityMembers[0] : entityMembers[0];

    const activeEntityId = activeMember.entityId;

    if (!activeEntityId) {
      throwForbidden();
    }

    const entity = await entityClient.getEntityDetails(activeEntityId);
    if (!entity) {
      throw new GraphQLError("Entity not found", {
        extensions: { code: "NOT_FOUND", http: { status: 404 } },
      });
    }

    let region: DatabaseRegion = DatabaseRegion.IND;
    const countryStr = entity.country?.toUpperCase();

    if (countryStr === "IND") {
      region = DatabaseRegion.IND;
    } else if (countryStr === "USA" || countryStr === "US") {
      region = DatabaseRegion.US;
    } else if (countryStr === "UAE") {
      region = DatabaseRegion.UAE;
    } else {
      throw new GraphQLError("Unsupported region", {
        extensions: { code: "BAD_REQUEST", http: { status: 400 } },
      });
    }

    const db = getDb(region);

    let roleData: any = null;
    if (activeMember.roleId) {
      roleData = await db.query.roles.findFirst({
        where: (roles: any, { eq }: any) => eq(roles.id, activeMember.roleId),
        with: {
          permissions: true,
        },
      });
    } else if (activeMember.role === "superAdmin") {
      // Fallback for legacy superAdmins if no roleId is set yet
      roleData = {
        name: "Super Admin",
        isSystem: true,
        permissions: [], // Logic would allow everything anyway
      };
    }

    const { userId: _u, email: _e, ...restDecoded } = decoded;

    return {
      ...restDecoded,
      id: admin.id,
      userId: decoded.userId,
      token,
      entity: entity.id,
      entityId: entity.id,
      db,
      country: region,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: roleData,
    };
  } catch (err) {
    console.error("Auth error:", err);
    if (err instanceof GraphQLError) throw err;

    throw new GraphQLError("Invalid/Expired token", {
      extensions: {
        code: "FORBIDDEN",
        http: { status: 403 },
      },
    });
  }
};

export default checkAuth;
