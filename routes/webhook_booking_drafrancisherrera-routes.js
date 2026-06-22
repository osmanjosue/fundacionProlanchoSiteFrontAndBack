const { Router } = require('express');
const express = require('express');
const { forwardBookingToN8n } = require('../controllers/webhook_booking_drafrancisherrera.controllers');
const { createRateLimiter } = require('../middlewares/rate-limiter');
const { verifyOrigin, verifyTurnstile } = require('../middlewares/chat-security.middleware');
const { validateBookingPayload } = require('../middlewares/booking-validation.middleware');

const router = Router();

const bookingRateLimiter = createRateLimiter(10, 15 * 60 * 1000, 'Demasiadas solicitudes de cita. Intenta de nuevo en unos minutos.');

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
