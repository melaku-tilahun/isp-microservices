const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');

// Health check
router.get('/health', (req, res) => portalController.getHealth(req, res));

// Root info
router.get('/', (req, res) => portalController.getHome(req, res));

// Invoice portal: /inv?t=<token>
router.get('/inv', (req, res, next) => portalController.getInvoicesPage(req, res, next));

module.exports = router;
