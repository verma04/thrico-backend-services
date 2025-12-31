import { eq } from "drizzle-orm";
import { customDomain } from "@thrico/database";

import checkAuth from "../../utils/auth/checkAuth.utils";
import { CUSTOM_DOMAIN, DOMAIN } from "@thrico/database"; // Need to verify if these models are exported from @thrico/database
import { GraphQLError } from "graphql";
import { registerDomain } from "../../utils/rabbit-mq/domin-register";
import { entityClient } from "@thrico/grpc";
import { customDomainQueue } from "../../queue/email-rabbit";
const dns = require("dns").promises;

function isSubdomain(url: string) {
  const domainPattern = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
  if (!domainPattern.test(url)) return false; // Not a valid domain format

  const parts = url.split(".");
  return parts.length > 2;
}

function getSubdomainFromHost(hostname: string) {
  const parts = hostname.split(".");

  if (parts.length > 2) {
    return parts.slice(0, parts.length - 2).join(".");
  }
  console.log(hostname);

  return null; // No subdomain
}

async function verifyCame(name: string, value: string) {
  try {
    const records = await dns.resolveCname(name);
    console.log(records);
    return records.includes(value);
  } catch (err: any) {
    if (err.code === "ENODATA") {
      console.error(`No CNAME records found for domain: `);
    } else {
      console.error(`Error querying DNS for domain`, err.message);
    }
    return false;
  }
}

async function verifyTxt(domain: string, name: string, value: string) {
  try {
    // Fetch TXT records for the domain
    const records = await dns.resolveTxt(`${name}.${domain}`);

    // Flatten records array and check if any record matches the value
    const flattenedRecords = records.flat().map((record: any) => record.trim());

    // Log and return if the value exists in any TXT record

    console.log(flattenedRecords);
    return flattenedRecords.includes(value);
  } catch (err: any) {
    if (err.code === "ENODATA") {
      console.error(`No TXT records found for domain: ${domain}`);
    } else {
      console.error(`Error querying DNS for domain ${domain}:`, err.message);
    }
    return false; // Return false if there's an error or no records
  }
}
async function verifyARecord(name: string, value: string) {
  try {
    const records = await dns.resolve4(name);
    console.log(records, name);
    return records.includes(value);
  } catch (err: any) {
    if (err.code === "ENODATA") {
      console.error(`No ARecords found for domain: `);
    } else {
      console.error(`Error querying DNS for domain`, err.message);
    }
    return false;
  }
}

function getDomainName(str: string) {
  // Remove any leading underscores or special characters
  const cleanedStr = str.replace(/^[_\.]+/, "");

  // Split the string by periods
  const parts = cleanedStr.split(".");

  // If there are more than two parts, return the last two as the domain
  if (parts.length > 1) {
    return parts.slice(-2).join(".");
  }
  return cleanedStr; // In case of a single part
}
async function checkDnsRecord(domain: any) {
  const { isSubDomain, cname, txt, aRecord, id, mainDomain } = domain;
  let checkCName = cname.verified;
  let checkTxt = txt.verified;
  let checkARecord = aRecord?.verified;

  if (!cname?.verified) {
    checkCName = await verifyCame(`${cname.name}.${mainDomain}`, cname.value);

    const set = await CUSTOM_DOMAIN.update(
      { id: id },
      {
        // Adjusted update signature if needed, user code: CUSTOM_DOMAIN.update(id, { $SET... })
        $SET: {
          cname: {
            verified: checkCName,
            name: cname.name,
            value: cname.value,
          },
        },
      }
    );
    console.log(set);
  }
  if (!txt?.verified) {
    checkTxt = await verifyTxt(mainDomain, txt.name, txt.value);

    await CUSTOM_DOMAIN.update(
      { id: id },
      {
        $SET: {
          txt: {
            verified: checkTxt,
            name: txt.name,
            value: txt.value,
          },
        },
      }
    );
  }
  if (!isSubDomain) {
    if (!aRecord?.verified) {
      checkARecord = await verifyARecord(domain.domain, aRecord.value);

      await CUSTOM_DOMAIN.update(
        { id: id },
        {
          $SET: {
            aRecord: {
              verified: checkARecord,
              name: aRecord.name,
              value: aRecord.value,
            },
          },
        }
      );
    }
  }

  if (isSubDomain) {
    if (checkCName && checkTxt) {
      const data = await CUSTOM_DOMAIN.update(
        { id: id },
        {
          $SET: {
            isVerified: true,
            ssl: false,
          },
        }
      );
      const v = data.toJSON();
      registerDomain({ ...v, type: "subdomain" });
    }
  }

  if (!isSubDomain) {
    if (checkCName && checkTxt && checkARecord) {
      const data = await CUSTOM_DOMAIN.update(
        { id: id },
        {
          $SET: {
            isVerified: true,
          },
        }
      );
      const v = data.toJSON();
      registerDomain({ ...v, type: "domain" });
    }
  }

  return true;
}

async function hasSSL(domain: string) {
  const httpsUrl = `https://${domain}`;

  try {
    const response = await fetch(httpsUrl, { method: "HEAD" });

    // If the request doesn't throw, SSL is working.
    return response.ok || (response.status >= 200 && response.status < 400);
  } catch (error) {
    // If the fetch fails, the domain likely doesn't support HTTPS
    return false;
  }
}
export const domainResolvers: any = {
  Query: {
    async getCustomDomain(_: any, {}: any, context: any) {
      try {
        const { entity } = await checkAuth(context);

        const findDomain = await CUSTOM_DOMAIN.query("entity")
          .eq(entity)
          .exec();
        if (findDomain[0]?.toJSON()) return findDomain[0]?.toJSON();
        else [];
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async getThricoDomain(_: any, {}: any, context: any) {
      try {
        const { entity } = await checkAuth(context);

        const findDomain = await DOMAIN.query("entity").eq(entity).exec();
        if (findDomain.length > 0 && findDomain[0]?.toJSON()) {
          return findDomain[0].toJSON();
        } else {
          throw new GraphQLError("No Thrico Domain Found", {
            extensions: {
              code: "NOT_FOUND",
              http: { status: 404 },
            },
          });
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async getCustomDomainDetails(_: any, { input }: any, context: any) {
      try {
        const { entity } = await checkAuth(context);

        const findDomain = await CUSTOM_DOMAIN.query("entity")
          .eq(entity)
          .filter("id")
          .eq(input.id)
          .exec();
        if (findDomain[0]?.toJSON()) return findDomain[0]?.toJSON();
        else
          return new GraphQLError("No Domain Found", {
            extensions: {
              code: "NOT FOUND",
              http: { status: 400 },
            },
          });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async checkDomainIsVerified(_: any, {}: any, context: any) {
      try {
        const { id, db, entity } = await checkAuth(context);

        // const userOrgId = await userOrg(id); // Replaced with entity from checkAuth
        const domain = await db.query.customDomain.findFirst({
          where: eq(customDomain.entity, entity),
        });

        // if (domain) {
        //     if (!domain?.status) checkDomainCName(domain)
        //     if (!domain?.ssl) checkSSl(domain)
        // }
        return domain;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async checkSSL(_: any, { input }: any, context: any) {
      try {
        const { entity, email, firstName, lastName } = await checkAuth(context);

        const findDomain = await CUSTOM_DOMAIN.query("entity")
          .eq(entity)

          .exec();
        console.log(findDomain[0]?.toJSON());

        if (findDomain[0]?.toJSON()) {
          const ifSsl = findDomain[0]?.toJSON().ssl;
          if (!ifSsl) {
            const value = findDomain[0]?.toJSON();

            const check = await hasSSL(value?.domain);

            const entityDetails = await entityClient.getEntityDetails(entity);
            if (check) {
              await CUSTOM_DOMAIN.update(
                { id: findDomain[0]?.toJSON().id },
                {
                  $SET: {
                    ssl: true,
                  },
                }
              );
              await customDomainQueue({
                entity,
                entityName: entityDetails?.name || "",
                email,
                firstName: firstName || "",
                lastName: lastName || "",
                domain: value?.domain,
              });
            }
          }
        } else
          return new GraphQLError("No Domain Found", {
            extensions: {
              code: "NOT FOUND",
              http: { status: 400 },
            },
          });
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
  Mutation: {
    async addCustomDomain(_: any, { input }: any, context: any) {
      try {
        const { id, entity } = await checkAuth(context);

        const findDomain = await CUSTOM_DOMAIN.query("entity")
          .eq(entity)
          .exec();

        if (findDomain.count !== 0) {
          return new GraphQLError("Sorry,  you already added domain", {
            extensions: {
              code: "NOT FOUND",
              http: { status: 400 },
            },
          });
        } else {
          const newDomain = await CUSTOM_DOMAIN.create({
            domain: input.domain,
            entity,
            isSubDomain: isSubdomain(input?.domain),
            mainDomain: getDomainName(input?.domain),
            cname: {
              name: isSubdomain(input?.domain)
                ? getSubdomainFromHost(input?.domain)
                : "www",
              value: "cname.thrico.network",
            },
            txt: {
              name: "_thrico.network",
              value: `thrico-verification-${Math.random()
                .toString(36)
                .substring(2, 10)}`,
            },
            aRecord: {
              name: !isSubdomain(input?.domain) ? "@" : "not-in-use",
              value: !isSubdomain(input?.domain)
                ? "206.189.138.137"
                : "not-in-use",
            },
          });

          return newDomain.toJSON();
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async deleteDomain(_: any, { input }: any, context: any) {
      try {
        const { entity } = await checkAuth(context);

        const currentDomain = await CUSTOM_DOMAIN.query("id")
          .eq(input.id)
          .exec();
        const domainData = currentDomain[0]?.toJSON();

        const findDomain = await CUSTOM_DOMAIN.delete({ id: input.id });

        return {
          success: true,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    async checkUpdatedDnsRecord(_: any, { input }: any, context: any) {
      try {
        const { entity } = await checkAuth(context);

        const findDomain = await CUSTOM_DOMAIN.query("entity")
          .eq(entity)
          .filter("id")
          .eq(input.id)
          .exec();
        const domain = findDomain[0].toJSON();

        const check = await checkDnsRecord(domain);

        const newValues = await CUSTOM_DOMAIN.query("entity")
          .eq(entity)
          .filter("id")
          .eq(input.id)
          .exec();
        const { cname, aRecord, txt, isSubDomain } = newValues[0].toJSON();

        return newValues[0].toJSON();
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  },
};
