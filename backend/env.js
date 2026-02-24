import dotenv from 'dotenv';
dotenv.config();

const required = [
    'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS',
    'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}