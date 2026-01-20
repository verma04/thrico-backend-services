import {
  generateTokens,
  JWTPayload,
  UserRole,
  DatabaseRegion,
} from "@thrico/shared";
import { ADMIN } from "@thrico/database";
import { encryptToken } from "./crypto/jwt.crypto";

export default async function generateJwtToken(otpEntry: any): Promise<string> {
  // Fetch admin to get email and other details for the token
  const adminResult = await ADMIN.query("id").eq(otpEntry.userId).exec();
  const admin = adminResult[0];

  if (!admin) {
    throw new Error("Admin not found for token generation");
  }

  const payload: JWTPayload = {
    userId: admin.id,
    email: admin.email,
    role: UserRole.ADMIN,
    region: DatabaseRegion.IND,
  };

  const { accessToken } = generateTokens(payload);
  const encrypted = encryptToken(`Bearer ${accessToken}`);

  return encrypted;
}
