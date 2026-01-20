import jwt from "jsonwebtoken";
import { encryptToken } from "./crypto/jwt.crypto";
import { ENV } from "@thrico/shared";

const generateJwtToken = async (entity: any) => {
  const secret =
    process.env.JWT_TOKEN || process.env.JWT_SECRET || String(ENV.JWT_SECRET);

  if (!secret) {
    throw new Error("JWT Secret is not defined in environment variables");
  }

  const jwtToken = jwt.sign(
    {
      ...entity,
    },
    secret,
    { expiresIn: "365d" } // One year expiration seems more reasonable than the previous value
  );

  const encrypt = await encryptToken(jwtToken);
  return encrypt;
};

export default generateJwtToken;
