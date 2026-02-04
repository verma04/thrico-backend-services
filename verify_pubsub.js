const Redis = require('ioredis');

// Attempt to read .env file manually since we are running a standalone script
require('dotenv').config();

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
});

async function test() {
    try {
        // ACL WHOAMI might fail if command is renamed or not allowed, but worth a try
        try {
            const user = await redis.call('ACL', 'WHOAMI');
            console.log('Current Redis User:', user);

            const aclList = await redis.call('ACL', 'LIST');
            // Filter or just show the user's acl
            console.log('ACL Debug:', aclList.find(line => line.startsWith(`user ${user}`)) || 'User not found in list');
        } catch (e) {
            console.log('Could not inspect ACLs:', e.message);
        }

        const sub = redis.duplicate();
        const channel = 'notification:pubsub:test-user-123';

        console.log('Attempting to subscribe to:', channel);

        await sub.subscribe(channel);
        console.log('✅ Subscribed successfully to', channel);
        await sub.unsubscribe(channel);

    } catch (err) {
        console.error('❌ Subscription failed:', err.message);
    } finally {
        redis.quit();
    }
}

test();
