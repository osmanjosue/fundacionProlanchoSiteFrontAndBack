/**
 * validar-admin.js — Autoriza solo al usuario administrador.
 *
 * Debe ir DESPUÉS de validarJWT (que setea req.uid). En vez de comparar contra
 * un ObjectId hardcodeado, compara contra ADMIN_UID del entorno: el "quién es
 * admin" vive en un solo lugar (.env) y no en el código.
 */
const { sendError } = require('../helpers/responses');

const validarAdmin = (req, res, next) => {
    if (!req.uid || req.uid !== process.env.ADMIN_UID) {
        return sendError(res, 403, 'No tienes permisos para realizar esta acción');
    }
    return next();
};

module.exports = { validarAdmin };
