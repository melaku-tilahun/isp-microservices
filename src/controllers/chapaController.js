const env = require('../config/env');
const chapaService = require('../services/chapaService');
const ispBackendService = require('../services/ispBackendService');
const sessionStore = require('../services/sessionStore');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

class ChapaController {
    /**
     * Initiate Chapa payment session and redirect customer.
     * POST /inv/chapa/initialize
     */
    async initializePayment(req, res, next) {
        try {
            const token = (req.body.token || '').trim();

            if (!token) {
                throw new AppError('Missing token for online payment session.', 400, 'MISSING_TOKEN');
            }

            // 1. Fetch invoice & customer records
            const invoiceData = await ispBackendService.getInvoices(token);
            const totalBalance = parseFloat(invoiceData.summary.total_balance_due) || 0;

            if (totalBalance <= 0) {
                throw new AppError('All invoices are already paid. No payment is required.', 400, 'NO_BALANCE_DUE');
            }

            const custCode = invoiceData.customer.code || 'CUST';
            const txRef = chapaService.generateTxRef(custCode);

            // Path-based return URL so parameters cannot be stripped or corrupted
            const returnUrl = `${env.PUBLIC_PORTAL_URL}/inv/chapa/callback/${encodeURIComponent(token)}/${encodeURIComponent(txRef)}`;
            const callbackUrl = `${env.PUBLIC_PORTAL_URL}/inv/chapa/webhook`;

            // 2. Cache transaction session in TTL session store
            sessionStore.set(txRef, {
                token: token,
                custCode: custCode,
                amount: totalBalance,
                createdAt: Date.now()
            });

            // 3. Request hosted checkout URL from Chapa
            const { checkoutUrl } = await chapaService.initializePayment({
                amount: totalBalance,
                currency: 'ETB',
                customerCode: custCode,
                fullName: invoiceData.customer.name,
                phone: invoiceData.customer.phone,
                returnUrl,
                callbackUrl
            });

            // 4. Redirect customer to Chapa hosted payment page
            res.redirect(checkoutUrl);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Handle return redirect callback from Chapa.
     * GET /inv/chapa/callback/:token?/:txRef?
     */
    async handleCallback(req, res, next) {
        try {
            logger.info('[Chapa Callback] Processing callback:', {
                originalUrl: req.originalUrl,
                params: req.params,
                query: req.query
            });

            let token = (req.params.token || req.query.token || req.query.t || '').trim();
            let txRef = (
                req.params.txRef ||
                req.query.tx_ref ||
                req.query['amp;tx_ref'] ||
                req.query.trx_ref ||
                req.query['amp;trx_ref'] ||
                req.query.reference ||
                ''
            ).trim();

            // Retrieve from session store if present
            let custCode = null;
            if (txRef && sessionStore.has(txRef)) {
                const sess = sessionStore.get(txRef);
                if (!token && sess.token) token = sess.token;
                custCode = sess.custCode;
            }

            // Fallback to most recent session if txRef missing from URL
            if (!txRef) {
                const latest = sessionStore.getLatest();
                if (latest) {
                    txRef = latest.key;
                    if (!token && latest.data.token) token = latest.data.token;
                    custCode = latest.data.custCode;
                }
            }

            // Fallback: extract customer code from txRef pattern CHAPA-{code}-{timestamp}
            if (!custCode && txRef) {
                const m = txRef.match(/^CHAPA-([^-]+(?:-[^-]+)*)-\d+$/i);
                if (m) custCode = m[1];
            }

            if (!txRef) {
                throw new AppError('Missing transaction details from payment gateway. Please check your bank or contact support.', 400, 'MISSING_TX_REF');
            }

            // 1. Verify transaction with Chapa API
            const verification = await chapaService.verifyTransaction(txRef);

            if (verification.isPaid) {
                const amountPaid = verification.amount;
                const chapaRef = verification.reference;

                // 2. Reconcile payment with ISP core backend
                await ispBackendService.completeOnlinePayment({
                    token,
                    customerCode: custCode,
                    gateway: 'chapa',
                    txRef,
                    amount: amountPaid,
                    chapaReference: chapaRef,
                    rawData: verification.data
                });

                // Clear session cache
                sessionStore.delete(txRef);

                // 3. Render success confirmation
                return res.render('layout', {
                    title: 'Payment Successful',
                    body: 'success',
                    data: {
                        ref: txRef,
                        method: 'Chapa (Instant Online Payment)',
                        amount: amountPaid,
                        message: 'Your online payment was verified and processed successfully! Your internet service has been restored.'
                    }
                });
            }

            // Payment was not completed or cancelled
            res.render('layout', {
                title: 'Payment Incomplete',
                body: 'expired',
                data: {
                    message: `Payment was not completed or was cancelled on Chapa (Status: ${verification.status || 'unconfirmed'}). You can try again or use bank transfer.`
                }
            });

        } catch (err) {
            next(err);
        }
    }

    /**
     * Handle incoming verified Chapa Webhook event.
     * POST /inv/chapa/webhook
     */
    async handleWebhook(req, res, next) {
        try {
            const event = req.parsedBody || req.body || {};
            const txRef = (event.tx_ref || event.trx_ref || '').trim();

            logger.info('[Chapa Webhook] Received webhook payload for txRef:', txRef);

            if (!txRef) {
                return res.status(400).json({ status: 'failed', message: 'Missing tx_ref in webhook payload' });
            }

            // Authoritative server-to-server verification check
            const verification = await chapaService.verifyTransaction(txRef);

            if (verification.isPaid) {
                let custCode = null;
                const m = txRef.match(/^CHAPA-([^-]+(?:-[^-]+)*)-\d+$/i);
                if (m) custCode = m[1];

                await ispBackendService.completeOnlinePayment({
                    customerCode: custCode,
                    gateway: 'chapa',
                    txRef,
                    amount: verification.amount,
                    chapaReference: verification.reference,
                    rawData: verification.data
                });

                return res.status(200).json({ status: 'success', message: 'Webhook verified and processed' });
            }

            res.status(200).json({ status: 'ignored', message: `Transaction status is ${verification.status}` });
        } catch (err) {
            logger.error('[Chapa Webhook] Error processing webhook:', err);
            res.status(500).json({ status: 'error', message: err.message });
        }
    }
}

module.exports = new ChapaController();
