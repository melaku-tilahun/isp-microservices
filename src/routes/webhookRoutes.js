const express = require('express');
const router = express.Router();
const verifyChapaWebhook = require('../middlewares/verifyChapaWebhook');
const chapaController = require('../controllers/chapaController');

// Webhook endpoint with raw JSON body buffer parsing
router.post(
    '/inv/chapa/webhook',
    express.raw({ type: 'application/json' }),
    verifyChapaWebhook,
    (req, res, next) => {
        chapaController.handleWebhook(req, res, next);
    }
);

module.exports = router;
