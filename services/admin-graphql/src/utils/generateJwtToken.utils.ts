import {
  generateTokens,
  JWTPayload,
  UserRole,
  DatabaseRegion,
} from "@thrico/shared";
import { ADMIN } from "@thrico/database";
import { encryptToken } from "./crypto/jwt.crypto";

async function generateJwtToken({
  userId,
  entityId,
}: {
  userId: string;
  entityId: string;
}): Promise<string> {
  const adminResult = await ADMIN.query("id").eq(userId).exec();
  const admin = adminResult[0];
  const payload = {
    userId: userId,
    entityId: entityId,
    email: admin.email,
    role: UserRole.ADMIN,
    region: DatabaseRegion.IND, // Defaulting to INDIA
  };

  const { accessToken } = generateTokens(payload);

  const encrypted = encryptToken(`Bearer ${accessToken}`);

  return encrypted;
}

async function generateJwtLoginToken(adminId: string): Promise<string> {
  // Fetch admin to get email and other details for the token
  const adminResult = await ADMIN.query("id").eq(adminId).exec();
  const admin = adminResult[0];

  if (!admin) {
    throw new Error("Admin not found for token generation");
  }

  const payload: JWTPayload = {
    userId: admin.id,
    email: admin.email,
    role: UserRole.ADMIN, // Defaulting to ADMIN for these resolvers
    region: DatabaseRegion.IND, // Defaulting to INDIA
  };

  const { accessToken } = generateTokens(payload);

  const encrypted = encryptToken(`Bearer ${accessToken}`);

  return encrypted;
}

export { generateJwtToken, generateJwtLoginToken };
