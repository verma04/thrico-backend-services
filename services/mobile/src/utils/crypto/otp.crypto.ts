import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Use JWT_SECRET as a base for the key or a dedicated OTP_SECRET if available
const SECRET =
  process.env.JWT_SECRET || "a-very-secure-fallback-secret-for-otp";
const KEY = crypto.scryptSync(SECRET, "salt", 32);
const IV_LENGTH = 16;

export async function encryptOtp(otp: string): Promise<string> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(otp, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export async function decryptOtp(encryptedOtp: string): Promise<string> {
  const [ivHex, encryptedText] = encryptedOtp.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
