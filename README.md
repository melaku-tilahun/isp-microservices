# Customer Invoice & Payment Microservice

A production-grade, decoupled payment microservice and customer-facing invoice portal.
Built with Node.js and Express following clean layered architecture and official Chapa gateway best practices.

---

## Architecture Overview

- **Decoupled Gateway & Portal**: The main ISP portal remains strictly private behind a firewall / VPN (`172.168.11.1` or WireGuard).
- **Dual Payment Flows**:
  - **⚡ Automated Gateway (Chapa)**: Direct hosted checkout, automated reconciliation, and immediate router queue un-suspension.
  - **📄 Manual Bank Transfer**: Slip upload (JPEG/PNG/WEBP/PDF) and reference declaration for staff approval.
- **Webhook Security**: Server-to-server webhook endpoint (`/inv/chapa/webhook`) verified via raw-buffer HMAC-SHA256 (`x-chapa-signature`) using constant-time comparison (`crypto.timingSafeEqual`).
- **Layered Structure**: Clear separation between Configuration, Gateway Client Services, Controllers, Routes, and Centralized Error Handling.
- **TTL Session Store**: In-memory payment session tracking with automatic 1-hour expiration to avoid memory leaks.

---

## Directory Structure

```
microservices/customer-invoice-portal/
├── server.js                        # Bootstrap & graceful shutdown (< 30 lines)
├── src/
│   ├── app.js                       # Express app pipeline & middleware mounts
│   ├── config/
│   │   ├── env.js                   # Validated environment configuration
│   │   └── constants.js             # Gateway enums, timeouts, file limits
│   ├── routes/
│   │   ├── index.js                 # Central route aggregator
│   │   ├── portalRoutes.js          # /inv, /health, /
│   │   ├── manualPaymentRoutes.js   # /inv/submit
│   │   ├── chapaRoutes.js           # /inv/chapa/initialize, /inv/chapa/callback
│   │   └── webhookRoutes.js         # /inv/chapa/webhook (raw body buffer)
│   ├── controllers/
│   │   ├── portalController.js      # Invoice portal view rendering & health checks
│   │   ├── manualPaymentController.js# Slip & transfer proof submissions
│   │   └── chapaController.js       # Chapa checkout init, callbacks, and webhooks
│   ├── services/
│   │   ├── chapaService.js          # Chapa SDK client (init, verify, HMAC signature)
│   │   ├── ispBackendService.js     # Communication with ISP PHP core backend API
│   │   └── sessionStore.js          # In-memory TTL cache with auto-expiration
│   ├── middlewares/
│   │   ├── verifyChapaWebhook.js    # HMAC-SHA256 webhook signature validator
│   │   ├── upload.js                # Multer upload with MIME type and size checks
│   │   └── errorHandler.js          # Centralized error handler (UI render vs JSON API)
│   └── utils/
│       ├── AppError.js              # Operational custom error class
│       └── logger.js                # Timestamped structured logger
├── views/                           # EJS UI templates (layout, invoices, success, expired)
└── public/                          # Static CSS and JavaScript assets
```

---

## Environment Variables (`.env`)

```env
PORT=3000
PUBLIC_PORTAL_URL=https://pay.yourdomain.com

# Core ISP Billing API
ISP_API_URL=http://172.168.11.1
ISP_API_KEY=YOUR_SECURE_PORTAL_SECRET_KEY

# Chapa Gateway Credentials
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-xxxxxxxxxxxxxxxxxxxx
CHAPA_SECRET_KEY=CHASECK_TEST-xxxxxxxxxxxxxxxxxxxx
CHAPA_ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
CHAPA_WEBHOOK_SECRET=CHASECK_TEST-xxxxxxxxxxxxxxxxxxxx
```

---

## Chapa Dashboard Configuration

1. **Callback / Webhook URL**:  
   `https://pay.yourdomain.com/inv/chapa/webhook`
2. **Webhook Secret**:  
   Set to match `CHAPA_WEBHOOK_SECRET` in your `.env`.

---

## Production Deployment (PM2)

```bash
# 1. Install production dependencies
npm install --production

# 2. Run and persist with PM2
pm2 start server.js --name "isp-payment-portal"
pm2 save
pm2 startup
```
