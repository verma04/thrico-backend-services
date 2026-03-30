import { promises as dns } from "dns";

/**
 * Verify if a TXT record exists with the expected value.
 */
export async function verifyTxtRecord(
  name: string,
  expectedValue: string,
): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(name);
    // records is string[][] (each entry is an array of segments)
    return records.some((record) => record.join("").includes(expectedValue));
  } catch (error) {
    return false;
  }
}

/**
 * Verify if a CNAME record exists with the expected value.
 */
export async function verifyCnameRecord(
  name: string,
  expectedValue: string,
): Promise<boolean> {
  try {
    const records = await dns.resolveCname(name);
    return records.some((r) => r.toLowerCase() === expectedValue.toLowerCase());
  } catch (error) {
    return false;
  }
}

/**
 * Verify SPF record for a domain.
 */
export async function verifySpfRecord(
  domain: string,
  expectedValue?: string,
): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(domain);
    const spfRecord = records.find((r) => r.join("").startsWith("v=spf1"));
    if (!spfRecord) return false;

    const fullSpf = spfRecord.join("");
    // Check if it includes amazonses.com
    return fullSpf.includes("include:amazonses.com");
  } catch (error) {
    return false;
  }
}

export interface DNSVerificationReport {
  txtVerified: boolean;
  dkimRecords: { name: string; value: string; verified: boolean }[];
  spfVerified: boolean;
  allVerified: boolean;
}

/**
 * Run a full DNS verification for SES domain.
 */
export async function verifyDomainDNS(
  domain: string,
  verificationToken: string,
  dkimTokens: string[],
): Promise<DNSVerificationReport> {
  const [txtVerified, spfVerified] = await Promise.all([
    verifyTxtRecord(`_amazonses.${domain}`, verificationToken),
    verifySpfRecord(domain),
  ]);

  const dkimResults = await Promise.all(
    dkimTokens.map(async (token) => {
      const name = `${token}._domainkey.${domain}`;
      const value = `${token}.dkim.amazonses.com`;
      const verified = await verifyCnameRecord(name, value);
      return { name, value, verified };
    }),
  );

  const allDkimVerified = dkimResults.every((r) => r.verified);
  const allVerified = txtVerified && spfVerified && allDkimVerified;

  return {
    txtVerified,
    dkimRecords: dkimResults,
    spfVerified,
    allVerified,
  };
}
