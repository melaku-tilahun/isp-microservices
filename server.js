require('dotenv').config();
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

const server = app.listen(env.PORT, () => {
    logger.info(`[InvoicePortal] Microservice running on port ${env.PORT}`);
    logger.info(`[InvoicePortal] ISP Backend URL: ${env.ISP_API_URL}`);
    logger.info(`[InvoicePortal] Public URL: ${env.PUBLIC_PORTAL_URL}`);
});

// Graceful shutdown handling
const handleShutdown = (signal) => {
    logger.info(`[InvoicePortal] Received ${signal}. Shutting down HTTP server cleanly...`);
    server.close(() => {
        logger.info('[InvoicePortal] HTTP server terminated.');
        process.exit(0);
    });

    // Fallback force shutdown after 10s
    setTimeout(() => {
        logger.error('[InvoicePortal] Forced shutdown due to timeout.');
        process.exit(1);
    }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
