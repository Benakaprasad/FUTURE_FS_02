import pkg from 'pg';
const { Pool } = pkg;

const IS_PROD = process.env.NODE_ENV === 'production';

const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    max:      10,
    idleTimeoutMillis:       30000,
    connectionTimeoutMillis: 5000,

    // Render requires SSL for external PostgreSQL connections
    ssl: IS_PROD ? { rejectUnauthorized: false } : false,
});

pool.query('SELECT NOW()')
    .then(() => console.log('✔ Database connected'))
    .catch((err) => {
        console.error('✘ Database connection failed:', err.message);
        process.exit(1);
    });

pool.on('error', (err) => {
    console.error('Unexpected database error:', err.message);
});

export default pool;