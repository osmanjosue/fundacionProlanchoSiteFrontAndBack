const { request, response } = require('express');
const { verificarMagicLinkToken } = require('../helpers/jwt-magic-link');

const validarMagicLink = (req = request, res = response, next) => {
    // El token puede venir en los headers (x-magic-token) o en los query params (?token=...)
    const token = req.header('x-magic-token') || req.query.token;

    if (!token) {
        return res.status(401).json({
            ok: false,
            msg: 'No hay token en la petición'
        });
    }

    try {
        // Verificar el token usando el helper
        const payload = verificarMagicLinkToken(token);
        
        // Obtener el ID de la postulación de la ruta (ej. /api/talento/magic/:id)
        const postulacionIdReq = req.params.id;

        // Validar que el token pertenece a la postulación solicitada
        if (payload.uid !== postulacionIdReq) {
            return res.status(403).json({
                ok: false,
                msg: 'El token no corresponde a esta postulación'
            });
        }

        // Si todo está bien, adjuntamos el payload al request por si se necesita
        req.magicPayload = payload;
        
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({
            ok: false,
            msg: 'Token no válido o expirado'
        });
    }
}

module.exports = {
    validarMagicLink
};
