import cron from 'node-cron';
import pool from '../config/database.js';

// Runs every day at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        const { rowCount: expiredTokens } = await pool.query(
            `DELETE FROM refresh_tokens WHERE expires_at < NOW()`
        );
        const { rowCount: revokedTokens } = await pool.query(
            `DELETE FROM refresh_tokens_revoked WHERE revoked_at < NOW() - INTERVAL '7 days'`
        );
        console.log(`[Cron] Cleanup done — removed ${expiredTokens} expired, ${revokedTokens} revoked tokens`);
    } catch (err) {
        console.error('[Cron] Token cleanup failed:', err.message);
    }
});