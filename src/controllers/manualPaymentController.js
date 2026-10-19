const ispBackendService = require('../services/ispBackendService');
const AppError = require('../utils/AppError');

class ManualPaymentController {
    /**
     * Handle manual bank transfer / slip submission.
     * POST /inv/submit
     */
    async submitManualPayment(req, res, next) {
        try {
            const { token, payment_method, transaction_ref, amount } = req.body;

            if (!token || !transaction_ref) {
                throw new AppError('Payment method and transaction reference are required.', 400, 'INVALID_SUBMISSION');
            }

            let receiptBase64 = null;
            let receiptFilename = null;

            if (req.file && req.file.buffer) {
                receiptBase64 = req.file.buffer.toString('base64');
                receiptFilename = req.file.originalname;
            }

            const result = await ispBackendService.submitManualPayment({
                token,
                paymentMethod: payment_method,
                transactionRef: transaction_ref,
                amount,
                receiptBase64,
                receiptFilename
            });

            res.render('layout', {
                title: 'Payment Submitted',
                body: 'success',
                data: {
                    ref: transaction_ref,
                    method: payment_method,
                    amount: amount,
                    message: result.message || 'Your payment slip has been uploaded and submitted for review.'
                }
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new ManualPaymentController();
