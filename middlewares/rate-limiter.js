const rateLimit = require('express-rate-limit');

const createRateLimiter = (maxRequests, windowMs, message) => {
    return rateLimit({
        windowMs,
        max: maxRequests,
        standardHeaders: true,
        legacyHeaders: false,
        message: { ok: false, msg: message || 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
    });
};

module.exports = { createRateLimiter };
