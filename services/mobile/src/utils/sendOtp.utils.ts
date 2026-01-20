import { OTP } from "@thrico/database";
import sendEmailOtp from "../queue/otp.queue";
import { encryptOtp } from "./crypto/otp.crypto";

const sendOtp = async (check: any): Promise<any> => {
  try {
    // Generate 4-digit OTP
    const generateOpt = Math.floor(1000 + Math.random() * 9000);
    const otpString = generateOpt.toString();

    const encryptedOtp = await encryptOtp(otpString);

    const otpEntry = {
      id: `otp-${Date.now()}`, // Unique ID for OTP
      userId: check.id,
      otp: encryptedOtp, // Encrypted OTP
      timeOfExpire: 10, // Expiration time (verify unit logic in consumer, likely minutes)
      isExpired: false,
    };

    const newOTP = await OTP.create(otpEntry);

    // Send email with the PLAIN text OTP
    await sendEmailOtp(check.email, otpString, check.firstName || "User");

    return newOTP.toJSON();
  } catch (error) {
    console.log("Error in sendOtp:", error);
    // Optionally rethrow or return null depending on desired error handling
    return null;
  }
};

export default sendOtp;
