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
        this.allowedReturnDomains = env.ALLOWED_RETURN_DOMAINS || [];
    }

    generateTxRef(customerCode = 'CUST') {
        const cleanCode = (customerCode || 'CUST').replace(/[^a-zA-Z0-9_-]/g, '');
        return `CHAPA-${cleanCode}-${Date.now()}`;
    }

    isAllowedUrl(urlString) {
        if (!urlString) return false;
        try {
            const parsed = new URL(urlString);
            const hostname = parsed.hostname.toLowerCase();
            // Allowed if hostname exactly matches or endsWith allowed domain (subdomains allowed)
            return this.allowedReturnDomains.some(d => {
                const domain = d.toLowerCase();
                return hostname === domain || hostname.endsWith(`.${domain}`);
            });
        } catch (err) {
            return false;
        }
    }

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

        // Validate return and callback URLs if provided
        if (returnUrl && !this.isAllowedUrl(returnUrl)) {
            throw new AppError('Invalid returnUrl provided.', 400, 'INVALID_RETURN_URL');
        }
        if (callbackUrl && !this.isAllowedUrl(callbackUrl)) {
            throw new AppError('Invalid callbackUrl provided.', 400, 'INVALID_CALLBACK_URL');
        }

        const nameParts = (fullName || 'Valued Customer').trim().split(/\s+/);
        const firstName = nameParts[0] || 'Valued';
        const lastName = nameParts.slice(1).join(' ') || 'Customer';

        let cleanPhone = (phone || '').replace(/[^\d]/g, '');
        if (cleanPhone.length < 9) {
            cleanPhone = '0900000000';
        }

        const safeCode = (customerCode || 'cust').toLowerCase().replace(/[^a-z0-9]/g, '');
        const email = `${safeCode}@gmail.com`;

        const txRef = this.generateTxRef(customerCode);

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

    verifyWebhookSignature(rawBody, signatureHeader) {
        if (!this.webhookSecret) {
            logger.error('[Chapa] Webhook secret not configured. Rejecting all webhooks.');
            return false;
        }

        if (!signatureHeader || !rawBody) {
            return false;
        }

        try {
            // Compute HMAC (hex)
            const computedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(rawBody)
                .digest('hex');

            // Normalize incoming signature: strip optional prefixes like "sha256=" and whitespace
            const normalized = String(signatureHeader).replace(/^sha256=/i, '').trim();

            // Both values should be hex; compare buffers with timingSafeEqual
            const signatureBuf = Buffer.from(normalized, 'hex');
            const computedBuf = Buffer.from(computedSignature, 'hex');

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
