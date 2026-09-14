const { Router } = require('express');
const fileUpload = require('express-fileupload');
const { check } = require('express-validator');
const { sendError } = require('../helpers/responses');

const { validarJWT } = require('../middlewares/validar-jwt');
const { validarAdmin } = require('../middlewares/validar-admin');
const { validarCampos } = require('../middlewares/validar-campos');
const { curriculoUploadMiddleware } = require('../middlewares/curriculo-upload.middleware');
const { asyncHandler } = require('../middlewares/async-handler');
const { createRateLimiter } = require('../middlewares/rate-limiter');
const { RATE_LIMITS } = require('../config/rate-limits');
const { NIVELES_EDUCATIVOS, AREAS_INTERES, ESTADOS_TALENTO, MAX_CURRICULO_SIZE } = require('../config/talento-listas');
const { crearPostulacion, listarPostulaciones, verPostulacion, cambiarEstadoPostulacion, verPostulacionPorMagicLink } = require('../controllers/talento-controllers');
const { solicitarAcceso, canjearAcceso } = require('../controllers/talento-acceso-controllers');
const { validarMagicLink } = require('../middlewares/validar-magic-link');

const router = Router();

router.use(fileUpload({
    limits: { fileSize: MAX_CURRICULO_SIZE },
    abortOnLimit: true,
    limitHandler: (req, res) => sendError(res, 413, 'El curriculo no puede pesar mas de 5MB'),
}));

router.post(
    '/',
    [
        createRateLimiter(RATE_LIMITS.talento.max, RATE_LIMITS.talento.windowMs, RATE_LIMITS.talento.message),
        check('nombreCompleto', 'El nombre completo es necesario (mínimo 3 caracteres)').trim().isLength({ min: 3 }),
        check('numeroDocumento', 'El número de documento es necesario').trim().notEmpty(),
        check('email', 'El correo electrónico no es válido').trim().isEmail(),
        check('telefono', 'El teléfono es necesario').trim().notEmpty(),
        check('ciudad', 'La ciudad es necesaria').trim().notEmpty(),
        check('nivelEducativo', 'Nivel educativo no válido').isIn(NIVELES_EDUCATIVOS),
        check('area', 'Área de interés no válida').isIn(AREAS_INTERES),
        // En multipart todo llega como string: con notEmpty(), "false" pasaría la
        // validación y Mongoose lo guardaría como false (consentimiento no dado).
        check('aceptaTratamientoDatos', 'Debes aceptar el tratamiento de datos').equals('true'),
        check('anosExperiencia', 'Los años de experiencia deben ser un número entre 0 y 60').optional().isInt({ min: 0, max: 60 }),
        check('linkedinUrl', 'El link de LinkedIn no es válido').optional().isURL(),
        check('presentacion', 'La presentación no puede exceder 1000 caracteres').optional().isLength({ max: 1000 }),
        validarCampos,
        curriculoUploadMiddleware,
    ],
    asyncHandler(crearPostulacion)
);

// Acceso al directorio por enlace mágico (para lectores autorizados)
router.post(
    '/acceso',
    [
        createRateLimiter(RATE_LIMITS.talentoAcceso.max, RATE_LIMITS.talentoAcceso.windowMs, RATE_LIMITS.talentoAcceso.message),
        check('email', 'El correo electrónico no es válido').trim().toLowerCase().isEmail(),
        validarCampos
    ],
    asyncHandler(solicitarAcceso)
);

router.post(
    '/acceso/canjear',
    [
        createRateLimiter(RATE_LIMITS.talentoAcceso.max, RATE_LIMITS.talentoAcceso.windowMs, RATE_LIMITS.talentoAcceso.message),
        check('token', 'El token es obligatorio').trim().notEmpty(),
        validarCampos
    ],
    asyncHandler(canjearAcceso)
);

// Los listados exponen datos personales y CVs de terceros: solo administrador.
router.get(
    '/',
    [
        validarJWT,
        validarAdmin,
        check('estado', 'Estado no válido').optional().isIn(ESTADOS_TALENTO),
        validarCampos,
    ],
    asyncHandler(listarPostulaciones)
);

router.get(
    '/:id',
    [
        validarJWT,
        validarAdmin,
        check('id', 'El id no es válido').isMongoId(),
        validarCampos,
    ],
    asyncHandler(verPostulacion)
);

// Acceso de solo lectura mediante Magic Link
router.get(
    '/magic/:id',
    [
        check('id', 'El id no es válido').isMongoId(),
        validarCampos,
        validarMagicLink,
    ],
    asyncHandler(verPostulacionPorMagicLink)
);

// Seguimiento del panel: marcar una postulación como revisada o descartada.
router.patch(
    '/:id/estado',
    [
        validarJWT,
        validarAdmin,
        check('id', 'El id no es válido').isMongoId(),
        check('estado', 'Estado no válido').isIn(ESTADOS_TALENTO),
        validarCampos,
    ],
    asyncHandler(cambiarEstadoPostulacion)
);

module.exports = router;
