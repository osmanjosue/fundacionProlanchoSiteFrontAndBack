const { Router } = require("express");
const { check } = require("express-validator");
const { validarCampos } = require("../middlewares/validar-campos");
const { sendEmailController } = require("../controllers/email.controllers");
const { createRateLimiter } = require("../middlewares/rate-limiter");

const router = Router();

const emailRateLimiter = createRateLimiter(5, 60 * 1000, 'Demasiados correos enviados. Intenta de nuevo en un minuto.');

router.post('/',
    [
        emailRateLimiter,
        check('to', 'El destinatario es necesario').notEmpty().isEmail(),
        check('replyTo', 'El correo de contacto es obligatorio').notEmpty().isEmail(),
        check('subject', 'El subject es necesario').notEmpty(),
        check('html', 'El cuerpo html es necesario').notEmpty(),
        validarCampos,
    ],
    sendEmailController,
);

module.exports = router;