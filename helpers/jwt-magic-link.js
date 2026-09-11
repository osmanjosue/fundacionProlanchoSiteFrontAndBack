const jwt = require('jsonwebtoken');

/**
 * Genera un JWT para acceso de solo lectura (Magic Link)
 * @param {string} postulacionId - ID de Mongo de la postulación
 * @returns {Promise<string>} Token firmado
 */
const generarMagicLinkToken = (postulacionId) => {
    return new Promise((resolve, reject) => {
        // En el payload incluimos el ID de la postulación (uid)
        // y un flag para identificar que es un magic link
        const payload = {
            uid: postulacionId,
            type: 'magic-link'
        };

        jwt.sign(payload, process.env.MAGIC_LINK_SECRET, {
            expiresIn: '48h' // Expira en 48 horas
        }, (err, token) => {
            if (err) {
                console.error(err);
                reject('No se pudo generar el token del Magic Link');
            } else {
                resolve(token);
            }
        });
    });
};

/**
 * Verifica un token JWT de Magic Link
 * @param {string} token - JWT token
 * @returns {Object} Payload decodificado si es válido, lanza error si no lo es
 */
const verificarMagicLinkToken = (token) => {
    try {
        const payload = jwt.verify(token, process.env.MAGIC_LINK_SECRET);
        
        if (payload.type !== 'magic-link') {
            throw new Error('Tipo de token inválido');
        }

        return payload; // { uid, type, iat, exp }
    } catch (error) {
        throw new Error('Token inválido o expirado');
    }
};

module.exports = {
    generarMagicLinkToken,
    verificarMagicLinkToken
};
