import './env.js';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import morgan       from 'morgan';
import hpp          from 'hpp';
import cookieParser from 'cookie-parser';
import xss          from 'xss-clean';

import './jobs/cleanupTokens.js';
import authRoutes   from './routes/auth.js';
import leadRoutes   from './routes/lead.js';


const PORT       = process.env.PORT       || 3000;
const IS_PROD    = process.env.NODE_ENV   === 'production';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy:    IS_PROD,
    crossOriginEmbedderPolicy: IS_PROD,
}));

app.use(cors({
    origin:         CLIENT_URL,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials:    true,
}));

app.use(morgan(IS_PROD ? 'combined' : 'dev'));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.originalUrl.startsWith('/api/auth'),
    message: { success: false, error: 'Too many requests, please try again later.' },
}));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
 keyGenerator: (req) => ipKeyGenerator(req),
  message: { success: false, error: 'Too many auth attempts, please try again later.' },
  skip: (req) => !IS_PROD 
    || req.path.startsWith('/staff')
    || req.path === '/me'        
    || req.path === '/refresh'   
    || req.path === '/logout',   
}));


app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(xss());
app.use(hpp());

app.get('/health', (_req, res) => {
    res.status(200).json({
        success:     true,
        status:      'healthy',
        timestamp:   new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

//loading routes
app.use('/api/auth', authRoutes);
app.use('/api/lead', leadRoutes);


app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

app.use((err, req, res, next) => { 
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

app.listen(PORT, () => {
    console.log('  FitZone Gym CRM');
    console.log(`  ENV  : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  PORT : ${PORT}`);
    console.log(`  API  : http://localhost:${PORT}/api`);
});