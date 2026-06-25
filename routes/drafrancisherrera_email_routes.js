const { Router } = require('express');
const express = require('express');
const { sendContactEmailController } = require('../controllers/drafrancisherrera_email_controller');
const { createRateLimiter } = require('../middlewares/rate-limiter');
const { verifyOrigin, verifyTurnstile } = require('../middlewares/chat-security.middleware');
const { validateContactPayload } = require('../middlewares/drafrancisherrera_email_validation');
const { asyncHandler } = require('../middlewares/async-handler');
const { RATE_LIMITS } = require('../config/rate-limits');

const router = Router();

const emailRateLimiter = createRateLimiter(RATE_LIMITS.email.max, RATE_LIMITS.email.windowMs, RATE_LIMITS.email.message);

router.post(
    '/',
    express.json({ limit: '5kb' }),
    emailRateLimiter,
    verifyOrigin,
    verifyTurnstile,
    validateContactPayload,
    asyncHandler(sendContactEmailController),
);

module.exports = router;
