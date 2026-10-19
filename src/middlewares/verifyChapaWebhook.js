const chapaService = require('../services/chapaService');
const logger = require('../utils/logger');

/**
 * Middleware to verify Chapa Webhook HMAC-SHA256 signature.
 * Note: Must be placed on a route where req.body is a raw Buffer (e.g. express.raw({ type: 'application/json' })).
 */
const verifyChapaWebhook = (req, res, next) => {
    const signature = req.headers['x-chapa-signature'];

    // In raw body mode, req.body is a Buffer
    const rawBody = req.body;

    const isValid = chapaService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
        logger.warn('[Chapa Webhook] Rejected unauthorized webhook payload - signature mismatch or missing.');
        return res.status(401).json({
            status: 'unauthorized',
            message: 'Invalid webhook signature'
        });
    }

    // Parse the raw buffer into JSON for downstream handlers
    try {
        if (Buffer.isBuffer(req.body)) {
            req.parsedBody = JSON.parse(req.body.toString('utf8'));
        } else {
            req.parsedBody = req.body;
        }
    } catch (err) {
        logger.error('[Chapa Webhook] Failed to parse verified webhook payload as JSON:', err);
        return res.status(400).json({
            status: 'bad_request',
            message: 'Invalid JSON payload'
        });
    }

    next();
};

module.exports = verifyChapaWebhook;
