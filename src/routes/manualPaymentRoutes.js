const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const manualPaymentController = require('../controllers/manualPaymentController');

// Submit manual transfer / slip: POST /inv/submit
router.post('/inv/submit', upload.single('receipt'), (req, res, next) => {
    manualPaymentController.submitManualPayment(req, res, next);
});

module.exports = router;
