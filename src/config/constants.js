module.exports = {
    CHAPA_API_URL: 'https://api.chapa.co/v1',
    SESSION_TTL_MS: 60 * 60 * 1000, // 1 hour TTL for in-memory payment sessions
    MAX_FILE_SIZE_BYTES: 8 * 1024 * 1024, // 8 MB
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ],
    SUBMISSION_STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected'
    },
    GATEWAYS: {
        CHAPA: 'chapa'
    }
};
