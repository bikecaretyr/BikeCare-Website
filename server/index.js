require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const routes = require('./routes/index');
const { errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

// ── Ensure logs directory ────────────────────────────────
// In serverless environments (e.g. Vercel at /var/task), the working
// directory may be read-only. We try to create the logs/ folder but
// silently fall back to console-only logging if it fails.
const logsDir = path.join(__dirname, '../logs');
try {
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
} catch (err) {
  console.warn(`Could not create logs directory at ${logsDir}: ${err.message}`);
}

// ── Connect DB ───────────────────────────────────────────
connectDB();

const app = express();

// ── Security Headers ─────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'fonts.gstatic.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS ─────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Compression ───────────────────────────────────────────
app.use(compression());

// ── Body Parsing ─────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// ── Security Middleware ───────────────────────────────────
app.use(mongoSanitize());  // Prevent NoSQL injection
app.use(xssClean());       // Sanitize XSS
app.use(hpp());            // HTTP param pollution

// ── Rate Limiting ─────────────────────────────────────────
app.use('/api/', globalLimiter);

// ── HTTP Logging ──────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// ── Trust Proxy (for rate limiting behind nginx) ──────────
app.set('trust proxy', 1);

// ── API Routes ────────────────────────────────────────────
app.use('/api', routes);

// ── Health Check ─────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date().toISOString() })
);

// ── Serve Static Frontend Files ──────────────────────────
// // ── Serve single Vite app ────────────────────────────────
// const appDist = path.join(__dirname, '../client/dist');
// app.use(express.static(appDist));

// // All non-API routes → React app (handles client-side routing)
// app.get('*', (req, res) => {
//   if (req.path.startsWith('/api')) {
//     return res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
//   }
//   res.sendFile(path.join(appDist, 'index.html'));
// });

// ── API Root / Optional Frontend Fallback ─────────────────
const appDist = path.join(__dirname, '../client/dist');
const indexHtml = path.join(appDist, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(appDist));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found.`,
      });
    }

    res.sendFile(indexHtml);
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'BMS API running',
      env: process.env.NODE_ENV,
    });
  });

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found.`,
      });
    }

    next();
  });
}


// ── Global Error Handler ──────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => { 
  logger.info(`🚀 BMS Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  logger.info(`📍 Public site:    http://localhost:${PORT}`);
  logger.info(`🔧 Employee portal: http://localhost:${PORT}/portal`);
  logger.info(`🔐 Admin panel:    http://localhost:${PORT}/admin`);
  logger.info(`⚡ SuperAdmin:     http://localhost:${PORT}/superadmin`);
 });

// ── Graceful Shutdown ─────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;
