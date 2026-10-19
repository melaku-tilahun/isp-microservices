const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const manualPaymentController = require('../controllers/manualPaymentController');

// Submit manual transfer / slip: POST /inv/submit
// Attach upload middleware then verify magic bytes, then controller
router.post('/inv/submit', upload.single('receipt'), upload.verifyUploadedFile, (req, res, next) => {
    manualPaymentController.submitManualPayment(req, res, next);
});

module.exports = router;
