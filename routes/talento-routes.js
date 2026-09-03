const { Router } = require('express');
const fileUpload = require('express-fileupload');
const { check } = require('express-validator');
const { sendError } = require('../helpers/responses');

const { validarJWT } = require('../middlewares/validar-jwt');
const { validarCampos } = require('../middlewares/validar-campos');
const { curriculoUploadMiddleware } = require('../middlewares/curriculo-upload.middleware');
const { asyncHandler } = require('../middlewares/async-handler');
const { createRateLimiter } = require('../middlewares/rate-limiter');
const { RATE_LIMITS } = require('../config/rate-limits');
const { NIVELES_EDUCATIVOS, AREAS_INTERES } = require('../config/talento-listas');
const { crearPostulacion, listarPostulaciones, verPostulacion } = require('../controllers/talento-controllers');

const router = Router();

router.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 },
    abortOnLimit: true,
    limitHandler: (req, res) => sendError(res, 413, 'El curriculo no puede pesar mas de 5MB'),
}));

router.post(
    '/',
    [
        createRateLimiter(RATE_LIMITS.talento.max, RATE_LIMITS.talento.windowMs, RATE_LIMITS.talento.message),
        check('nombreCompleto', 'El nombre completo es necesario (mínimo 3 caracteres)').trim().isLength({ min: 3 }),
        check('numeroDocumento', 'El número de documento es necesario').notEmpty(),
        check('email', 'El correo electrónico no es válido').isEmail(),
        check('telefono', 'El teléfono es necesario').notEmpty(),
        check('ciudad', 'La ciudad es necesaria').notEmpty(),
        check('nivelEducativo', 'Nivel educativo no válido').isIn(NIVELES_EDUCATIVOS),
        check('area', 'Área de interés no válida').isIn(AREAS_INTERES),
        check('aceptaTratamientoDatos', 'Debes aceptar el tratamiento de datos').notEmpty(),
        check('linkedinUrl', 'El link de LinkedIn no es válido').optional().isURL(),
        check('presentacion', 'La presentación no puede exceder 1000 caracteres').optional().isLength({ max: 1000 }),
        validarCampos,
        curriculoUploadMiddleware,
    ],
    asyncHandler(crearPostulacion)
);

router.get('/', [validarJWT], asyncHandler(listarPostulaciones));

router.get('/:id', [validarJWT], asyncHandler(verPostulacion));

module.exports = router;