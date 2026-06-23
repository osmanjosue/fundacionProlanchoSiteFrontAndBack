const { Router } = require('express');
const express = require('express');
const { forwardBookingToN8n } = require('../controllers/webhook_booking_drafrancisherrera.controllers');
const { createRateLimiter } = require('../middlewares/rate-limiter');
const { verifyOrigin, verifyTurnstile } = require('../middlewares/chat-security.middleware');
const { validateBookingPayload } = require('../middlewares/booking-validation.middleware');
const { RATE_LIMITS } = require('../config/rate-limits');

const router = Router();

const bookingRateLimiter = createRateLimiter(RATE_LIMITS.booking.max, RATE_LIMITS.booking.windowMs, RATE_LIMITS.booking.message);

router.post(
    '/',
    express.json({ limit: '5kb' }),
    bookingRateLimiter,
    verifyOrigin,
    verifyTurnstile,
    validateBookingPayload,
    forwardBookingToN8n
);

module.exports = router;
