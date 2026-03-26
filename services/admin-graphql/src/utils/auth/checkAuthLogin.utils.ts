import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import { ADMIN } from "@thrico/database";
import { JWTPayload, ENV } from "@thrico/shared";
import { decryptToken } from "../crypto/jwt.crypto";

export type AuthLoginContext = {
  id: string;
  userId: string;
  token: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
} & Partial<JWTPayload>;

const checkAuthLogin = async (
  context: any,
  tokenOverride?: string,
): Promise<AuthLoginContext> => {
  let authHeaderRaw = tokenOverride || context.headers?.authorization;

  if (!authHeaderRaw) {
    throw new GraphQLError("Authentication Required", {
      extensions: {
        code: "UNAUTHORIZED",
        http: { status: 401 },
      },
    });
  }

  const authHeader = await decryptToken(authHeaderRaw);

  if (!authHeader) {
    throw new GraphQLError("Invalid Token", {
      extensions: {
        code: "FORBIDDEN",
        http: { status: 403 },
      },
    });
  }

  const token = authHeader?.split("Bearer ")[1];

  if (!token) {
    throw new GraphQLError("Invalid Token Format", {
      extensions: {
        code: "FORBIDDEN",
        http: { status: 403 },
      },
    });
  }

  try {
    const decoded = jwt.verify(token, String(ENV.JWT_SECRET)) as JWTPayload;

    // For login auth, we only need to verify the admin exists globally
    const adminResult = await ADMIN.query("id").eq(decoded.userId).exec();
    const admin = adminResult[0];

    if (!admin) {
      throw new GraphQLError("Admin user not found", {
        extensions: { code: "NOT_FOUND", http: { status: 404 } },
      });
    }

    const { userId: _u, email: _e, ...restDecoded } = decoded;

    return {
      ...restDecoded,
      id: admin.id,
      userId: decoded.userId,
      token,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
    };
  } catch (err) {
    console.error("Auth Login error:", err);
    if (err instanceof GraphQLError) throw err;

    throw new GraphQLError("Invalid/Expired token", {
      extensions: {
        code: "FORBIDDEN",
        http: { status: 403 },
      },
    });
  }
};

export default checkAuthLogin;
