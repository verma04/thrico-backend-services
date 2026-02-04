const fs = require('fs/promises');
const assert = require('assert');

// MOCK js-yaml
const yaml = {
    dump: (obj) => JSON.stringify(obj),
    load: (str) => JSON.parse(str)
};
console.log(`[MOCK] Writing to ${path}`);
const config = yaml.load(content);

// VERIFICATION LOGIC
try {
    const domain = "example.com";
    const safeBrandId = "test_brand";
    const baseRouterKey = "example-com";
    const wwwRouterKey = "www-example-com";
    const redirectMiddleware = `redirect-to-base-${safeBrandId}`;

    // Check 1: Base Router should exist and point to service
    assert(config.http.routers[baseRouterKey], "Base router missing");
    assert.strictEqual(config.http.routers[baseRouterKey].service, `brand-${safeBrandId}`, "Base router should point to service");
    assert(!config.http.routers[baseRouterKey].middlewares.includes(redirectMiddleware), "Base router should NOT have redirect middleware");

    // Check 2: WWW Router should exist and redirect
    assert(config.http.routers[wwwRouterKey], "WWW router missing");
    assert(config.http.routers[wwwRouterKey].middlewares.includes(redirectMiddleware), "WWW router MUST have redirect middleware");

    // Check 3: Middleware configuration
    const middlewareConfig = config.http.middlewares[redirectMiddleware];
    assert(middlewareConfig, "Redirect middleware missing");
    assert.strictEqual(middlewareConfig.redirectRegex.replacement, `https://${domain}/$1`, "Redirect replacement incorrect");

    console.log("✅ VERIFICATION PASSED: Logic correctly redirects WWW -> Base");

} catch (e) {
    console.error("❌ VERIFICATION FAILED:", e.message);
    process.exit(1);
}


const mockExists = async () => false; // File doesn't exist for fresh start

// REPLICATE processTask SCOPE
const DYNAMIC_DIR = "/tmp/test";
const APP_SERVICE_URL = "http://app:3000";

// COPIED & ADAPTED processTask for testing
async function processTask(task) {
    const { action, brandId, domain, type } = task;
    const safeBrandId = brandId.replace(/[^a-zA-Z0-9-_]/g, "");
    const filePath = `${DYNAMIC_DIR}/entity-${domain}.yml`;

    let config = {
        http: {
            routers: {},
            services: {},
            middlewares: {}
        },
    };

    if (action === "add") {
        config.http.middlewares = config.http.middlewares || {};
        config.http.middlewares[`redirect-to-https`] = {
            redirectScheme: { scheme: "https", permanent: true },
        };

        config.http.services = config.http.services || {};
        config.http.services[`brand-${safeBrandId}`] = {
            loadBalancer: { servers: [{ url: APP_SERVICE_URL }] },
        };

        if (type === 'domain') {
            const wwwDomain = `www.${domain}`;
            const baseDomain = domain;

            // 1. Router for Base (Actual Service)
            const baseRouterKey = `${baseDomain.replace(/\./g, "-")}`;
            config.http.routers[baseRouterKey] = {
                rule: `Host(\`${baseDomain}\`)`,
                service: `brand-${safeBrandId}`,
                entryPoints: ["websecure"],
                middlewares: ["redirect-to-https"], // UPDATED: removed redirect middleware
                tls: { certResolver: "letsencrypt" },
            };

            // 2. Middleware for Redirect WWW -> Base
            const redirectMiddlewareName = `redirect-to-base-${safeBrandId}`;
            config.http.middlewares[redirectMiddlewareName] = {
                redirectRegex: {
                    regex: `^https?://www\\.${baseDomain.replace(/\./g, '\\.')}/(.*)`,
                    replacement: `https://${baseDomain}/$1`,
                    permanent: true
                }
            };

            // 3. Router for WWW (Redirects to Base)
            const wwwRouterKey = `${wwwDomain.replace(/\./g, "-")}`;
            config.http.routers[wwwRouterKey] = {
                rule: `Host(\`${wwwDomain}\`)`,
                service: `brand-${safeBrandId}`,
                entryPoints: ["websecure"],
                middlewares: ["redirect-to-https", redirectMiddlewareName], // UPDATED: Added redirect middleware
                tls: { certResolver: "letsencrypt" },
            };

            await mockWriteFile(filePath, yaml.dump(config));
        }
    }
}

// RUN TEST
processTask({
    action: "add",
    domain: "example.com",
    brandId: "test_brand",
    type: "domain"
}).catch(console.error);
