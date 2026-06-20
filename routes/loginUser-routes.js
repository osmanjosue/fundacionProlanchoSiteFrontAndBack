//path: /api/login'

const { Router } = require('express');
const { loginUser, renewToken } = require('../controllers/loginUser-controllers');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { createRateLimiter } = require('../middlewares/rate-limiter');
const router = Router();

const loginRateLimiter = createRateLimiter(3, 60 * 1000, 'Demasiados intentos de inicio de sesión. Intenta de nuevo en un minuto.');

router.post('/',
    [
        loginRateLimiter,
        check('name', 'El nombre del usuario es requerido').notEmpty(),
        check('password', 'La contraseña es requerida para poder ingresar').notEmpty(),
        validarCampos
    ],
    loginUser)

router.get(
    '/renew',
    validarJWT,
    renewToken
    )

module.exports = router;