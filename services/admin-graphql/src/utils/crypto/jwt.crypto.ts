import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET =
  process.env.JWT_CRYPTO_SECRET ||
  process.env.JWT_SECRET ||
  "a-very-secure-fallback-secret-for-jwt-crypto";
const KEY = crypto.scryptSync(SECRET, "salt", 32);
const IV_LENGTH = 16;

/**
 * Encrypts a string (e.g., a token) using AES-256-CBC.
 */
export async function encryptToken(token: string): Promise<string> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an encrypted token string.
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    const [ivHex, encryptedText] = encryptedToken.split(":");
    if (!ivHex || !encryptedText) {
      // If it's not in the expected format, return as is (could be a plain token if already decrypted or not encrypted)
      return encryptedToken;
    }
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // If decryption fails, it might not be encrypted
    return encryptedToken;
  }
}
