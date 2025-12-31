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
    role: UserRole.ADMIN, // Defaulting to ADMIN for these resolvers
    region: DatabaseRegion.IND, // Defaulting to INDIA
  };

  console.log(payload);
  const { accessToken } = generateTokens(payload);

  const encrypted = encryptToken(`Bearer ${accessToken}`);

  console.log(encrypted, "eneeeeee");
  return encrypted;
}
