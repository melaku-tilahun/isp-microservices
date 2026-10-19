const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const webhookRoutes = require('./routes/webhookRoutes');
const portalRoutes = require('./routes/portalRoutes');
const manualPaymentRoutes = require('./routes/manualPaymentRoutes');
const chapaRoutes = require('./routes/chapaRoutes');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

// Security headers
app.disable('x-powered-by');
app.use(helmet());

// Basic global rate limiting (tune thresholds for your environment)
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static assets
app.use(express.static(path.join(__dirname, '../public')));

// 1. Mount Webhook routes first (before global json body parser so raw buffer is captured)
app.use(webhookRoutes);

// 2. Standard body parsers for portal and API forms
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 3. Mount remaining application routes
app.use(portalRoutes);
app.use(manualPaymentRoutes);
app.use(chapaRoutes);

// 4. Catch-all 404 handler
app.use((req, res, next) => {
    next(new AppError('The requested page or resource could not be found.', 404, 'RESOURCE_NOT_FOUND'));
});

// 5. Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
