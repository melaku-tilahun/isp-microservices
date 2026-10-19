const express = require('express');
const router = express.Router();

const webhookRoutes = require('./webhookRoutes');
const portalRoutes = require('./portalRoutes');
const manualPaymentRoutes = require('./manualPaymentRoutes');
const chapaRoutes = require('./chapaRoutes');

// Mount routes
router.use(webhookRoutes);
router.use(portalRoutes);
router.use(manualPaymentRoutes);
router.use(chapaRoutes);

module.exports = router;
