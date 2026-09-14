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

const EXPIRACION_ACCESO = '15m';
const EXPIRACION_SESION = '8h';

const generarTokenLectorBase = (email, tipo, expiracion) => {
    return new Promise((resolve, reject) => {
        if (typeof email !== 'string' || email.trim() === '') {
            return reject('El correo es obligatorio para generar el token');
        }
        const payload = { email: email.trim().toLowerCase(), type: tipo };
        jwt.sign(payload, process.env.MAGIC_LINK_SECRET, { expiresIn: expiracion }, (err, token) => {
            if (err) {
                console.error(`Error generando token de ${tipo}:`, err);
                reject('No se pudo generar el token');
            } else {
                resolve(token);
            }
        });
    });
};

const verificarTokenLectorBase = (token, tipoEsperado) => {
    try {
        const payload = jwt.verify(token, process.env.MAGIC_LINK_SECRET);
        if (payload.type !== tipoEsperado) {
            throw new Error('Tipo de token inválido');
        }
        return payload;
    } catch (error) {
        throw new Error('Token inválido o expirado');
    }
};

/**
 * Genera un token de enlace para el acceso por correo
 * @param {string} email - Correo del lector
 * @returns {Promise<string>} Token firmado
 */
const generarTokenAccesoLector = (email) => generarTokenLectorBase(email, 'acceso-lector', EXPIRACION_ACCESO);

/**
 * Verifica el token de enlace de correo
 * @param {string} token 
 * @returns {Object} Payload decodificado
 */
const verificarTokenAccesoLector = (token) => verificarTokenLectorBase(token, 'acceso-lector');

/**
 * Genera el token de sesión (para la tabla)
 * @param {string} email - Correo del lector
 * @returns {Promise<string>} Token firmado
 */
const generarTokenSesionLector = (email) => generarTokenLectorBase(email, 'sesion-lector', EXPIRACION_SESION);

/**
 * Verifica el token de sesión (del header)
 * @param {string} token 
 * @returns {Object} Payload decodificado
 */
const verificarTokenSesionLector = (token) => verificarTokenLectorBase(token, 'sesion-lector');


module.exports = {
    generarMagicLinkToken,
    verificarMagicLinkToken,
    generarTokenAccesoLector,
    verificarTokenAccesoLector,
    generarTokenSesionLector,
    verificarTokenSesionLector
};
