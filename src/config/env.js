// src/config/env.js
require('dotenv').config();

const parseAllowedDomains = (input) => {
  if (!input) return [];
  return input.split(',').map(s => s.trim()).filter(Boolean);
};

const env = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  ISP_API_URL: (process.env.ISP_API_URL || 'http://localhost:8000').replace(/\/+$/, ''),
  ISP_API_KEY: process.env.ISP_API_KEY || '',
  CHAPA_PUBLIC_KEY: process.env.CHAPA_PUBLIC_KEY || '',
  CHAPA_SECRET_KEY: process.env.CHAPA_SECRET_KEY || '',
  CHAPA_ENCRYPTION_KEY: process.env.CHAPA_ENCRYPTION_KEY || '',
  CHAPA_WEBHOOK_SECRET: process.env.CHAPA_WEBHOOK_SECRET || process.env.CHAPA_SECRET_KEY || '',
  PUBLIC_PORTAL_URL: (process.env.PUBLIC_PORTAL_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  ALLOWED_RETURN_DOMAINS: parseAllowedDomains(process.env.ALLOWED_RETURN_DOMAINS || process.env.PUBLIC_PORTAL_URL)
};

// In production we fail fast if critical secrets are missing
if (process.env.NODE_ENV === 'production') {
  const required = ['CHAPA_SECRET_KEY', 'CHAPA_WEBHOOK_SECRET', 'ISP_API_KEY'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }
}

if (!env.CHAPA_SECRET_KEY) {
  console.warn('[Config Warning] CHAPA_SECRET_KEY is not defined in .env.');
}

module.exports = env;
