const ispBackendService = require('../services/ispBackendService');
const AppError = require('../utils/AppError');

class PortalController {
    /**
     * Microservice health check.
     */
    getHealth(req, res) {
        res.json({
            status: 'ok',
            service: 'customer-invoice-portal',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Root URL handler.
     */
    getHome(req, res) {
        res.render('layout', {
            title: 'Customer Invoice Portal',
            body: 'expired',
            data: {
                message: 'Please access this portal using the link provided in your billing SMS notification.'
            }
        });
    }

    /**
     * Invoice viewing portal: GET /inv?t=<token>
     */
    async getInvoicesPage(req, res, next) {
        try {
            const token = (req.query.t || req.query.token || '').trim();

            if (!token) {
                throw new AppError('Missing invoice token. Please use the full link received in your SMS.', 400, 'MISSING_TOKEN');
            }

            const data = await ispBackendService.getInvoices(token);

            res.render('layout', {
                title: 'Unpaid Invoices',
                body: 'invoices',
                data: {
                    token: token,
                    customer: data.customer,
                    summary: data.summary,
                    can_submit: data.can_submit !== false,
                    submission_state: data.submission_state || 'none',
                    latest_submission: data.latest_submission || null,
                    invoices: data.invoices,
                    paymentAccounts: data.payment_accounts,
                    company: data.company
                }
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new PortalController();
