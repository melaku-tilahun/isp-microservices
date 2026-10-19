const env = require('../config/env');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

class IspBackendService {
    constructor() {
        this.apiUrl = env.ISP_API_URL;
        this.apiKey = env.ISP_API_KEY;
    }

    /**
     * Common headers for ISP Backend API calls.
     */
    getHeaders() {
        return {
            'X-API-KEY': this.apiKey,
            'Accept': 'application/json'
        };
    }

    /**
     * Retrieve customer details, invoice list, and submission state by token.
     */
    async getInvoices(token) {
        if (!token) {
            throw new AppError('Portal access token is missing.', 400, 'MISSING_TOKEN');
        }

        const url = `${this.apiUrl}/api/portal/invoices?token=${encodeURIComponent(token)}`;

        try {
            const resp = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            const data = await resp.json();

            if (!resp.ok || !data.success) {
                const msg = data.message || 'Invoice link has expired or is invalid.';
                throw new AppError(msg, resp.status === 404 ? 404 : 400, 'INVOICE_NOT_FOUND');
            }

            return data;
        } catch (err) {
            if (err instanceof AppError) throw err;
            logger.error('[IspBackend] Error fetching invoices:', err);
            throw new AppError('Unable to retrieve invoice records from billing server.', 503, 'BACKEND_COMM_ERROR');
        }
    }

    /**
     * Submit a manual bank transfer / slip payment proof.
     */
    async submitManualPayment({
        token,
        paymentMethod,
        transactionRef,
        amount,
        receiptBase64 = null,
        receiptFilename = null
    }) {
        if (!token || !transactionRef) {
            throw new AppError('Token and transaction reference are required.', 400, 'INVALID_INPUT');
        }

        const url = `${this.apiUrl}/api/portal/submit-payment`;

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    ...this.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    payment_method: paymentMethod,
                    transaction_ref: transactionRef,
                    amount: parseFloat(amount) || 0,
                    receipt_base64: receiptBase64,
                    receipt_filename: receiptFilename
                })
            });

            const data = await resp.json();

            if (!resp.ok || !data.success) {
                const msg = data.message || 'Failed to submit payment reference.';
                throw new AppError(msg, resp.status || 400, 'SUBMISSION_REJECTED');
            }

            return data;
        } catch (err) {
            if (err instanceof AppError) throw err;
            logger.error('[IspBackend] Error submitting manual payment:', err);
            throw new AppError('Communication error with billing server during submission.', 503, 'BACKEND_COMM_ERROR');
        }
    }

    /**
     * Notify core billing system to reconcile an automated gateway payment.
     */
    async completeOnlinePayment({
        token = null,
        customerCode = null,
        gateway = 'chapa',
        txRef,
        amount,
        chapaReference,
        rawData = null
    }) {
        const url = `${this.apiUrl}/api/portal/complete-online-payment`;

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    ...this.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    customer_code: customerCode,
                    gateway,
                    tx_ref: txRef,
                    amount: parseFloat(amount) || 0,
                    chapa_reference: chapaReference,
                    raw_data: rawData
                })
            });

            const data = await resp.json();

            if (!resp.ok || !data.success) {
                logger.error('[IspBackend] Online payment reconciliation failed:', data);
                throw new AppError(data.message || 'Payment reconciliation failed on billing system.', 500, 'RECONCILIATION_ERROR');
            }

            return data;
        } catch (err) {
            if (err instanceof AppError) throw err;
            logger.error('[IspBackend] Network error during online payment reconciliation:', err);
            throw new AppError('Failed to communicate with billing system for online payment.', 503, 'BACKEND_COMM_ERROR');
        }
    }
}

module.exports = new IspBackendService();
