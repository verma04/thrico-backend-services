import AWS from "aws-sdk";
import { log } from "@thrico/logging";

const ses = new AWS.SES({
  region: process.env.AWS_REGION || "ap-south-1",
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
});

/**
 * Verify a custom domain identity with SES.
 * Returns verification token + DKIM tokens.
 */
export async function verifyDomainIdentity(domain: string) {
  try {
    // Step 1: Initiate domain verification
    const verifyResult = await ses
      .verifyDomainIdentity({ Domain: domain })
      .promise();
    const verificationToken = verifyResult.VerificationToken;

    // Step 2: Enable DKIM for the domain
    const dkimResult = await ses.verifyDomainDkim({ Domain: domain }).promise();
    const dkimTokens = dkimResult.DkimTokens;

    return {
      verificationToken,
      dkimTokens,
      txtRecord: `_amazonses.${domain}`,
      txtValue: verificationToken,
      dkimRecords: dkimTokens.map((token) => ({
        name: `${token}._domainkey.${domain}`,
        value: `${token}.dkim.amazonses.com`,
      })),
      spfRecord: `v=spf1 include:amazonses.com ~all`,
    };
  } catch (error) {
    log.error(`SES verifyDomainIdentity error for domain ${domain}:`, error);
    throw error;
  }
}

/**
 * Check domain verification status in SES.
 */
export async function checkDomainVerificationStatus(domain: string) {
  try {
    const result = await ses
      .getIdentityVerificationAttributes({
        Identities: [domain],
      })
      .promise();

    const status =
      result.VerificationAttributes[domain]?.VerificationStatus || "NotStarted";

    return {
      domain,
      status, // Pending | Success | Failed | TemporaryFailure | NotStarted
      verified: status === "Success",
    };
  } catch (error) {
    log.error(`SES checkDomainVerificationStatus error for ${domain}:`, error);
    throw error;
  }
}

/**
 * Send an email via SES.
 */
export async function sendEmailViaSES(params: {
  from: string;
  bcc: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  try {
    const bccAddresses = Array.isArray(params.bcc) ? params.bcc : [params.bcc];

    const result = await ses
      .sendEmail({
        Source: params.from,
        Destination: {
          ToAddresses: [params.from],
          BccAddresses: bccAddresses,
        },
        Message: {
          Subject: {
            Data: params.subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: params.html,
              Charset: "UTF-8",
            },
          },
        },
        ...(params.replyTo ? { ReplyToAddresses: [params.replyTo] } : {}),
      })
      .promise();

    return {
      messageId: result.MessageId,
      success: true,
    };
  } catch (error) {
    log.error("SES sendEmailViaSES error:", { error, params });
    throw error;
  }
}

/**
 * Delete a domain identity from SES.
 */
export async function deleteDomainIdentity(domain: string) {
  try {
    await ses.deleteIdentity({ Identity: domain }).promise();
    return { success: true };
  } catch (error) {
    log.error(`SES deleteDomainIdentity error for ${domain}:`, error);
    throw error;
  }
}

/**
 * Get sending quota from SES.
 */
export async function getSendingQuota() {
  try {
    const quota = await ses.getSendQuota().promise();
    return {
      max24HourSend: quota.Max24HourSend,
      maxSendRate: quota.MaxSendRate,
      sentLast24Hours: quota.SentLast24Hours,
    };
  } catch (error) {
    log.error("SES getSendingQuota error:", error);
    throw error;
  }
}
