const express = require('express');
const path = require('path');

const webhookRoutes = require('./routes/webhookRoutes');
const portalRoutes = require('./routes/portalRoutes');
const manualPaymentRoutes = require('./routes/manualPaymentRoutes');
const chapaRoutes = require('./routes/chapaRoutes');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

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
