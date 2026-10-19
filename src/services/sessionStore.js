const { SESSION_TTL_MS } = require('../config/constants');
const logger = require('../utils/logger');

class SessionStore {
    constructor(ttlMs = SESSION_TTL_MS) {
        this.store = new Map();
        this.ttlMs = ttlMs;

        // Periodic cleanup every 15 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 15 * 60 * 1000);
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref(); // Don't prevent process exit
        }
    }

    set(key, value) {
        this.store.set(key, {
            data: value,
            expiresAt: Date.now() + this.ttlMs
        });
    }

    get(key) {
        const item = this.store.get(key);
        if (!item) return null;

        if (Date.now() > item.expiresAt) {
            this.store.delete(key);
            return null;
        }

        return item.data;
    }

    has(key) {
        return this.get(key) !== null;
    }

    delete(key) {
        return this.store.delete(key);
    }

    getLatest() {
        if (this.store.size === 0) return null;
        const keys = Array.from(this.store.keys());
        for (let i = keys.length - 1; i >= 0; i--) {
            const key = keys[i];
            const data = this.get(key);
            if (data) return { key, data };
        }
        return null;
    }

    cleanup() {
        const now = Date.now();
        let purged = 0;
        for (const [key, item] of this.store.entries()) {
            if (now > item.expiresAt) {
                this.store.delete(key);
                purged++;
            }
        }
        if (purged > 0) {
            logger.debug(`Purged ${purged} expired transaction sessions from SessionStore`);
        }
    }
}

module.exports = new SessionStore();
