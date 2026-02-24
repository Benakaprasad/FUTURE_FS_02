import './env.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    ssl:      process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }  // required for Render PostgreSQL
                : false,
});

async function migrate() {
    console.log('Running migration...');
    try {
        const sql = readFileSync(join(__dirname, 'migration.sql'), 'utf8');
        await pool.query(sql);
        console.log('✔ Migration completed successfully');
    } catch (err) {
        console.error('✘ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();