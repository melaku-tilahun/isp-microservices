const crypto = require('crypto');
const env = require('../config/env');
const { CHAPA_API_URL } = require('../config/constants');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

class ChapaService {
    constructor() {
        this.secretKey = env.CHAPA_SECRET_KEY;
        this.webhookSecret = env.CHAPA_WEBHOOK_SECRET;
        this.apiUrl = CHAPA_API_URL;
    }

    /**
     * Generate a unique transaction reference formatted for Chapa.
     * Pattern: CHAPA-{custCode}-{timestamp}
     */
    generateTxRef(customerCode = 'CUST') {
        const cleanCode = (customerCode || 'CUST').replace(/[^a-zA-Z0-9_-]/g, '');
        return `CHAPA-${cleanCode}-${Date.now()}`;
    }

    /**
     * Initialize a hosted payment session with Chapa.
     */
    async initializePayment({
        amount,
        currency = 'ETB',
        customerCode,
        fullName = '',
        phone = '',
        returnUrl,
        callbackUrl = null
    }) {
        if (!this.secretKey) {
            throw new AppError('Chapa secret key is not configured.', 500, 'GATEWAY_CONFIG_ERROR');
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            throw new AppError('Valid positive payment amount is required.', 400, 'INVALID_AMOUNT');
        }

        // Split full name
        const nameParts = (fullName || 'Valued Customer').trim().split(/\s+/);
        const firstName = nameParts[0] || 'Valued';
        const lastName = nameParts.slice(1).join(' ') || 'Customer';

        // Format clean phone number
        let cleanPhone = (phone || '').replace(/[^\d]/g, '');
        if (cleanPhone.length < 9) {
            cleanPhone = '0900000000';
        }

        // Strict email required by Chapa
        const safeCode = (customerCode || 'cust').toLowerCase().replace(/[^a-z0-9]/g, '');
        const email = `${safeCode}@gmail.com`;

        const txRef = this.generateTxRef(customerCode);

        // Chapa title constraint: strictly max 16 chars
        const title = 'Internet Payment';

        const payload = {
            amount: numAmount.toFixed(2),
            currency,
            email,
            first_name: firstName,
            last_name: lastName,
            phone_number: cleanPhone,
            tx_ref: txRef,
            return_url: returnUrl,
            customization: {
                title: title,
                description: 'Bill payment'
            }
        };

        if (callbackUrl) {
            payload.callback_url = callbackUrl;
        }

        logger.info(`[Chapa] Initializing payment for txRef: ${txRef}, amount: ${numAmount}`);

        const response = await fetch(`${this.apiUrl}/transaction/initialize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || result.status !== 'success' || !result.data?.checkout_url) {
            logger.error('[Chapa] Initialization failed:', result);
            const msg = (result && typeof result.message === 'string') 
                ? result.message 
                : 'Failed to initiate Chapa payment session';
            throw new AppError(msg, 502, 'GATEWAY_INIT_ERROR');
        }

        return {
            txRef,
            checkoutUrl: result.data.checkout_url
        };
    }

    /**
     * Verify a transaction with Chapa API.
     */
    async verifyTransaction(txRef) {
        if (!txRef) {
            throw new AppError('Transaction reference is required for verification.', 400, 'MISSING_TX_REF');
        }

        logger.info(`[Chapa] Verifying transaction: ${txRef}`);

        const response = await fetch(`${this.apiUrl}/transaction/verify/${encodeURIComponent(txRef)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.secretKey}`
            }
        });

        const result = await response.json();
        logger.debug('[Chapa] Verification result:', result);

        if (!response.ok || result.status !== 'success') {
            return {
                isPaid: false,
                status: result?.data?.status || 'failed',
                message: result?.message || 'Verification unconfirmed',
                data: result?.data || null
            };
        }

        const data = result.data || {};
        const isPaid = data.status === 'success' || data.status === 'paid';

        return {
            isPaid,
            status: data.status,
            amount: parseFloat(data.amount) || 0,
            reference: data.reference || txRef,
            currency: data.currency || 'ETB',
            data
        };
    }

    /**
     * Verify HMAC-SHA256 signature of incoming Chapa webhook.
     * @param {Buffer|string} rawBody - Raw request body
     * @param {string} signatureHeader - x-chapa-signature header value
     */
    verifyWebhookSignature(rawBody, signatureHeader) {
        if (!this.webhookSecret) {
            logger.warn('[Chapa] Webhook secret not configured. Skipping signature verification (not recommended for production).');
            return true;
        }

        if (!signatureHeader || !rawBody) {
            return false;
        }

        try {
            const computedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(rawBody)
                .digest('hex');

            const signatureBuf = Buffer.from(signatureHeader, 'utf8');
            const computedBuf = Buffer.from(computedSignature, 'utf8');

            if (signatureBuf.length !== computedBuf.length) {
                return false;
            }

            return crypto.timingSafeEqual(signatureBuf, computedBuf);
        } catch (err) {
            logger.error('[Chapa] Webhook signature verification error:', err);
            return false;
        }
    }
}

module.exports = new ChapaService();
