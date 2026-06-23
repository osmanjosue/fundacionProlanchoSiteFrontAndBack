const { Router } = require("express");
const { check } = require("express-validator");
const { validarCampos } = require("../middlewares/validar-campos");
const { sendEmailController } = require("../controllers/email.controllers");
const { createRateLimiter } = require("../middlewares/rate-limiter");
const { asyncHandler } = require("../middlewares/async-handler");
const { RATE_LIMITS } = require("../config/rate-limits");

const router = Router();

const emailRateLimiter = createRateLimiter(RATE_LIMITS.email.max, RATE_LIMITS.email.windowMs, RATE_LIMITS.email.message);

router.post('/',
    [
        emailRateLimiter,
        check('to', 'El destinatario es necesario').notEmpty().isEmail(),
        check('replyTo', 'El correo de contacto es obligatorio').notEmpty().isEmail(),
        check('subject', 'El subject es necesario').notEmpty(),
        check('html', 'El cuerpo html es necesario').notEmpty(),
        validarCampos,
    ],
    asyncHandler(sendEmailController),
);

module.exports = router;