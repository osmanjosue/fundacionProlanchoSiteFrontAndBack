//path: /api/login'

const { Router } = require('express');
const { loginUser, renewToken } = require('../controllers/loginUser-controllers');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { createRateLimiter } = require('../middlewares/rate-limiter');
const { asyncHandler } = require('../middlewares/async-handler');
const { RATE_LIMITS } = require('../config/rate-limits');
const router = Router();

const loginRateLimiter = createRateLimiter(RATE_LIMITS.login.max, RATE_LIMITS.login.windowMs, RATE_LIMITS.login.message);

router.post('/',
    [
        loginRateLimiter,
        check('name', 'El nombre del usuario es requerido').notEmpty(),
        check('password', 'La contraseña es requerida para poder ingresar').notEmpty(),
        validarCampos
    ],
    asyncHandler(loginUser))

router.get(
    '/renew',
    validarJWT,
    asyncHandler(renewToken)
    )

module.exports = router;