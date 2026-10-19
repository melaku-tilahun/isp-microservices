const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Centralized application error handling middleware.
 */
const errorHandler = (err, req, res, next) => {
    logger.error(`[ErrorHandler] ${req.method} ${req.originalUrl}:`, err);

    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational || false;
    const message = isOperational
        ? err.message
        : 'An unexpected error occurred. Please try again shortly or contact support.';

    // Check if request expects JSON (API or Webhook)
    const isApiRequest = 
        req.path.startsWith('/api') ||
        req.path.includes('/webhook') ||
        req.xhr ||
        (req.headers.accept && req.headers.accept.includes('application/json'));

    if (isApiRequest) {
        return res.status(statusCode).json({
            status: statusCode >= 500 ? 'error' : 'fail',
            code: err.code || 'INTERNAL_ERROR',
            message: message
        });
    }

    // Default: Render HTML friendly error page for customer portal
    res.status(statusCode).render('layout', {
        title: statusCode === 404 ? 'Page Not Found' : 'Notice',
        body: 'expired',
        data: {
            message: message
        }
    });
};

module.exports = errorHandler;
