/**
 * Lightweight structured logger with timestamps and levels.
 */
const logger = {
    info(message, meta = '') {
        console.log(`[${new Date().toISOString()}] [INFO] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn(message, meta = '') {
        console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    error(message, error = '') {
        console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, error?.stack || error || '');
    },
    debug(message, meta = '') {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${new Date().toISOString()}] [DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
        }
    }
};

module.exports = logger;
