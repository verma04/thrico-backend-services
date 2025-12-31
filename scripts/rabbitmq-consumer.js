const amqp = require("amqp-connection-manager");
const mongoose = require("mongoose");
const yaml = require("js-yaml");
const fs = require("fs/promises");
const path = require("path");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://admin:secret@domain-queue.thrico.network:5672";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/queueLogs";
const APP_SERVICE_URL = process.env.APP_SERVICE_URL || "http://app:3000";
const DYNAMIC_DIR = path.resolve(__dirname, "/root/traefik/dynamic");

// Define Mongoose schema and model
const FailedJobSchema = new mongoose.Schema({
    queue: String,
    data: Object,
    error: String,
    timestamp: { type: Date, default: Date.now },
});

const FailedJob = mongoose.model("FailedJob", FailedJobSchema);

async function logFailedJob(queue, data, error) {
    try {
        await FailedJob.create({ queue, data, error });
        console.log("Logged failed job to MongoDB");
    } catch (err) {
        console.error("Error logging to MongoDB:", err);
    }
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function processTask(task) {
    const { action, brandId, domain, type } = task; // Added type
    console.log(`[PROCESS] Starting task: Action=${action}, Domain=${domain}, BrandId=${brandId}, Type=${type}`);

    const safeBrandId = brandId.replace(/[^a-zA-Z0-9-_]/g, "");
    const filePath = `${DYNAMIC_DIR}/entity-${domain}.yml`;
    console.log(`[PROCESS] Target file path: ${filePath}`);

    try {
        // Initialize default config with required structure
        let config = {
            http: {
                routers: {},
                services: {},
                middlewares: {}
            },
        };

        const exists = await fileExists(filePath);
        console.log(`[PROCESS] File exists check: ${exists}`);

        if (exists) {
            console.log(`[PROCESS] Reading existing file content...`);
            const fileContent = await fs.readFile(filePath, "utf8");
            if (!fileContent.trim()) {
                console.warn(`[PROCESS] YAML file ${filePath} is empty. Using default config.`);
            } else {
                try {
                    const parsedConfig = yaml.load(fileContent);
                    if (!parsedConfig || typeof parsedConfig !== "object") {
                        console.error(`[PROCESS] Invalid YAML content in ${filePath}: Parsed content is not an object.`);
                        return false;
                    }
                    config = parsedConfig;
                    console.log(`[PROCESS] Successfully parsed existing YAML config.`);

                    if (!config.http) {
                        console.warn(`[PROCESS] Invalid YAML structure in ${filePath}: Missing 'http' key. Initializing default.`);
                        config.http = { routers: {}, services: {} };
                    } else if (!config.http.routers) {
                        console.warn(`[PROCESS] Invalid YAML structure in ${filePath}: Missing 'routers' key. Initializing default.`);
                        config.http.routers = {};
                    }
                    // Ensure middlewares exists
                    config.http.middlewares = config.http.middlewares || {};
                } catch (yamlError) {
                    console.error(`[PROCESS] Error parsing YAML file ${filePath}:`, yamlError.message);
                    return false;
                }
            }
        } else {
            console.log(`[PROCESS] File does not exist. Using new default config.`);
        }

        if (action === "add") {
            console.log(`[PROCESS] processing ADD action...`);
            // Common Redirect-to-HTTPS Middleware
            config.http.middlewares = config.http.middlewares || {};
            config.http.middlewares[`redirect-to-https`] = {
                redirectScheme: {
                    scheme: "https",
                    permanent: true
                },
            };

            // Service Definition
            config.http.services = config.http.services || {};
            config.http.services[`brand-${safeBrandId}`] = {
                loadBalancer: {
                    servers: [{ url: APP_SERVICE_URL }],
                },
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
                    middlewares: ["redirect-to-https"],
                    tls: {
                        certResolver: "letsencrypt",
                    },
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
                    service: `brand-${safeBrandId}`, // Needs a service, even if redirecting
                    entryPoints: ["websecure"],
                    middlewares: ["redirect-to-https", redirectMiddlewareName],
                    tls: {
                        certResolver: "letsencrypt",
                    },
                };

                console.log(`[ADD] Configured redirection for ${wwwDomain} -> ${domain}`);

            } else {
                // Default / Subdomain Logic
                const routerKey = `${domain.replace(/\./g, "-")}`;
                config.http.routers[routerKey] = {
                    rule: `Host(\`${domain}\`)`,
                    service: `brand-${safeBrandId}`,
                    entryPoints: ["websecure"],
                    middlewares: ["redirect-to-https"],
                    tls: {
                        certResolver: "letsencrypt",
                    },
                };
                console.log(`[ADD] Router added for domain: ${domain}`);
            }

            console.log(`[PROCESS] Writing to file: ${filePath}`);
            await fs.writeFile(filePath, yaml.dump(config, { noCompatMode: true }));
            console.log(`[PROCESS] File write successful.`);
            return true;

        } else if (action === "delete") {
            console.log(`[PROCESS] processing DELETE action...`);
            if (type === 'domain') {
                // Delete both routers
                const wwwRouterKey = `www-${domain.replace(/\./g, "-")}`;
                const baseRouterKey = `${domain.replace(/\./g, "-")}`;
                delete config.http.routers[wwwRouterKey];
                delete config.http.routers[baseRouterKey];
                // Clean up middleware?
                delete config.http.middlewares[`redirect-to-base-${safeBrandId}`];
            } else {
                const routerKey = `${domain.replace(/\./g, "-")}`;
                delete config.http.routers[routerKey];
            }

            if (Object.keys(config.http.routers).length === 0) {
                console.log(`[PROCESS] No routers left. Removing file: ${filePath}`);
                await fs.unlink(filePath).catch(() => { });
                console.log(`[DELETE] Config removed: ${filePath}`);
            } else {
                console.log(`[PROCESS] Updating file (routers remaining): ${filePath}`);
                await fs.writeFile(filePath, yaml.dump(config, { noCompatMode: true }));
                console.log(`[DELETE] Router removed for domain: ${domain}`);
            }
            return true;
        }
        console.error(`[PROCESS] Invalid action: ${action}`);
        return false;
    } catch (error) {
        console.error(`[PROCESS] Error processing task for domain ${domain}:`, error.message);
        return false;
    }
}

async function startConsumer() {
    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected to MongoDB");

        const connection = await amqp.connect([RABBITMQ_URL]);

        const channelWrapper = connection.createChannel({
            json: true,
            setup: async (channel) => {
                await channel.assertQueue("DOMAIN_REGISTER", { durable: true });
                await channel.consume(
                    "DOMAIN_REGISTER",
                    async (msg) => {
                        console.log(`[CONSUMER] Message received.`);
                        if (msg !== null) {
                            try {
                                const raw = msg.content.toString();
                                console.log(`[CONSUMER] Raw content: ${raw}`);
                                const data = JSON.parse(raw);
                                console.log(`[CONSUMER] Parsed data:`, data);

                                if (!data.domain || !data.entity) {
                                    throw new Error("Invalid message payload: domain and entity are required.");
                                }

                                console.log(`[CONSUMER] Invoking processTask...`);
                                const value = await processTask({
                                    action: "add",
                                    domain: data.domain,
                                    brandId: data.entity,
                                    type: data.type || (data.domain.split('.').length > 2 ? 'subdomain' : 'domain'), // Fallback if type missing
                                });
                                console.log(`[CONSUMER] processTask returned: ${value}`);

                                if (value) {
                                    // Success: Acknowledge the message
                                    channelWrapper.ack(msg);
                                    console.log(`[CONSUMER] Successfully processed message for domain: ${data.domain}. ACK sent.`);
                                } else {
                                    // Failure: Log and nack (optionally requeue)
                                    await logFailedJob("DOMAIN_REGISTER", data, "Failed to process task");
                                    channelWrapper.nack(msg, false, true); // Requeue for retry
                                    console.warn(`[CONSUMER] Failed to process message for domain: ${data.domain}. NACK sent.`);
                                }
                            } catch (err) {
                                console.error("[CONSUMER] Error processing message:", err.message);
                                await logFailedJob("DOMAIN_REGISTER", msg.content.toString(), err.message);
                                channelWrapper.nack(msg, false, true); // Requeue for retry
                                console.log(`[CONSUMER] Exception caught. NACK sent.`);
                            }
                        }
                    },
                    { noAck: false }
                );
            },
        });

        channelWrapper.on("connect", () => console.log("Consumer connected to RabbitMQ"));
        channelWrapper.on("disconnect", (err) => console.error("Consumer disconnected from RabbitMQ", err));
    } catch (error) {
        console.error("Failed to start consumer:", error);
    }
}

startConsumer();
