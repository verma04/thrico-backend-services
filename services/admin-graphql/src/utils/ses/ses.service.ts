import AWS from "aws-sdk";

const ses = new AWS.SES({
  region: process.env.AWS_REGION || "ap-south-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

/**
 * Verify a custom domain identity with SES.
 * Returns verification token + DKIM tokens.
 */
export async function verifyDomainIdentity(domain: string) {
  // Step 1: Initiate domain verification
  const verifyResult = await ses
    .verifyDomainIdentity({ Domain: domain })
    .promise();
  const verificationToken = verifyResult.VerificationToken;

  // Step 2: Enable DKIM for the domain
  const dkimResult = await ses
    .verifyDomainDkim({ Domain: domain })
    .promise();
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
}

/**
 * Check domain verification status in SES.
 */
export async function checkDomainVerificationStatus(domain: string) {
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
}

/**
 * Send an email via SES.
 */
export async function sendEmailViaSES(params: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const toAddresses = Array.isArray(params.to) ? params.to : [params.to];

  const result = await ses
    .sendEmail({
      Source: params.from,
      Destination: {
        ToAddresses: toAddresses,
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
}

/**
 * Delete a domain identity from SES.
 */
export async function deleteDomainIdentity(domain: string) {
  await ses.deleteIdentity({ Identity: domain }).promise();
  return { success: true };
}

/**
 * Get sending quota from SES.
 */
export async function getSendingQuota() {
  const quota = await ses.getSendQuota().promise();
  return {
    max24HourSend: quota.Max24HourSend,
    maxSendRate: quota.MaxSendRate,
    sentLast24Hours: quota.SentLast24Hours,
  };
}
