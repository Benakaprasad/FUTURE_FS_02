import './env.js';

import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import morgan       from 'morgan';
import rateLimit    from 'express-rate-limit';
import hpp          from 'hpp';
import cookieParser from 'cookie-parser';
import xss          from 'xss-clean';

import './jobs/cleanupTokens.js';
import authRoutes   from './routes/auth.js';
import leadRoutes   from './routes/lead.js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT       || 3000;
const IS_PROD    = process.env.NODE_ENV   === 'production';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// 1. Security Headers
// ─────────────────────────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy:    IS_PROD,
    crossOriginEmbedderPolicy: IS_PROD,
}));

// ─────────────────────────────────────────────────────────────────────────────
// 2. CORS — credentials:true required for httpOnly cookie to be sent
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({
    origin:         CLIENT_URL,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials:    true,
}));

// ─────────────────────────────────────────────────────────────────────────────
// 3. Logging
// ─────────────────────────────────────────────────────────────────────────────
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// ─────────────────────────────────────────────────────────────────────────────
// 4. Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, error: 'Too many requests, please try again later.' },
}));

app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, error: 'Too many auth attempts, please try again later.' },
}));

// ─────────────────────────────────────────────────────────────────────────────
// 5. Body Parsing — MUST come before xss() and hpp()
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─────────────────────────────────────────────────────────────────────────────
// 6. Input Sanitization — runs after body is parsed
// ─────────────────────────────────────────────────────────────────────────────
app.use(xss());
app.use(hpp());

// ─────────────────────────────────────────────────────────────────────────────
// 7. Health Check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.status(200).json({
        success:     true,
        status:      'healthy',
        timestamp:   new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Routes
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/lead', leadRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 9. 404 — Unknown routes
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Global Error Handler — all next(err) calls land here
// ─────────────────────────────────────────────────────────────────────────────
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const statusCode = err.statusCode || err.status || 500;

    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
        statusCode,
        message: err.message,
        ...(IS_PROD ? {} : { stack: err.stack }),
    });

    res.status(statusCode).json({
        success: false,
        error: IS_PROD && statusCode === 500
            ? 'Something went wrong. Please try again later.'
            : err.message || 'Internal Server Error',
        ...(IS_PROD ? {} : { stack: err.stack }),
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Start
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('─────────────────────────────────────────');
    console.log('  FitZone Gym CRM');
    console.log(`  ENV  : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  PORT : ${PORT}`);
    console.log(`  API  : http://localhost:${PORT}/api`);
    console.log('─────────────────────────────────────────');
});