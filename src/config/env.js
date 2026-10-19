require('dotenv').config();

const env = {
    PORT: parseInt(process.env.PORT, 10) || 3000,
    ISP_API_URL: (process.env.ISP_API_URL || 'http://localhost:8000').replace(/\/+$/, ''),
    ISP_API_KEY: process.env.ISP_API_KEY || '',
    CHAPA_PUBLIC_KEY: process.env.CHAPA_PUBLIC_KEY || '',
    CHAPA_SECRET_KEY: process.env.CHAPA_SECRET_KEY || '',
    CHAPA_ENCRYPTION_KEY: process.env.CHAPA_ENCRYPTION_KEY || '',
    CHAPA_WEBHOOK_SECRET: process.env.CHAPA_WEBHOOK_SECRET || process.env.CHAPA_SECRET_KEY || '',
    PUBLIC_PORTAL_URL: (process.env.PUBLIC_PORTAL_URL || 'http://localhost:3000').replace(/\/+$/, '')
};

if (!env.CHAPA_SECRET_KEY) {
    console.warn('[Config Warning] CHAPA_SECRET_KEY is not defined in .env.');
}

module.exports = env;
