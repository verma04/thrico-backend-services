
const Redis = require('ioredis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function check() {
    const redis = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME,
    });

    try {
        console.log('--- Redis Diagnostic ---');
        await redis.ping();
        console.log('Ping: OK');

        console.log('\nChecking WHOAMI...');
        try {
            const whoami = await redis.call('ACL', 'WHOAMI');
            console.log('WHOAMI:', whoami);
        } catch (e) {
            console.log('ACL WHOAMI failed:', e.message);
        }

        console.log('\nChecking if PUBLISH is allowed...');
        try {
            await redis.publish('notification:test_diag', '{"test":true}');
            console.log('PUBLISH to "notification:test_diag": OK');
        } catch (e) {
            console.log('PUBLISH failed:', e.message);
        }

        console.log('\nChecking SUBSCRIBE patterns...');
        const patterns = [
            'test',
            'notification:test',
            'app_user:test',
            '*'
        ];

        for (const p of patterns) {
            try {
                console.log(`Trying SUBSCRIBE to "${p}"...`);
                await redis.subscribe(p);
                console.log(`  SUBSCRIBE "${p}": OK`);
                await redis.unsubscribe(p);
            } catch (e) {
                console.log(`  SUBSCRIBE "${p}" failed:`, e.message);
            }
        }

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await redis.quit();
    }
}

check();
