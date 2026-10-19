const express = require('express');
const router = express.Router();
const chapaController = require('../controllers/chapaController');

// Initialize Chapa checkout session
router.post('/inv/chapa/initialize', (req, res, next) => {
    chapaController.initializePayment(req, res, next);
});

// Chapa customer return callback (supports path params and query parameters)
router.get([
    '/inv/chapa/callback/:token/:txRef',
    '/inv/chapa/callback/:token',
    '/inv/chapa/callback'
], (req, res, next) => {
    chapaController.handleCallback(req, res, next);
});

module.exports = router;
